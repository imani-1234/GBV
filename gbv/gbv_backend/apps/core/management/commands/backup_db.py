import os
import subprocess
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Backup the database to a timestamped file in the backups/ directory"

    def add_arguments(self, parser):
        parser.add_argument(
            "--output-dir",
            default=None,
            help="Override the backup output directory",
        )

    def handle(self, *args, **options):
        backup_dir = Path(options["output_dir"] or settings.BASE_DIR / "backups")
        backup_dir.mkdir(parents=True, exist_ok=True)

        db_settings = settings.DATABASES["default"]
        engine = db_settings["ENGINE"]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"gbv_backup_{timestamp}"

        if "postgresql" in engine:
            filename += ".sql"
            filepath = backup_dir / filename
            env = os.environ.copy()
            env["PGPASSWORD"] = db_settings.get("PASSWORD", "")
            result = subprocess.run(
                [
                    "pg_dump",
                    "-h", db_settings.get("HOST", "localhost"),
                    "-p", str(db_settings.get("PORT", "5432")),
                    "-U", db_settings.get("USER", "postgres"),
                    "-d", db_settings["NAME"],
                    "-f", str(filepath),
                ],
                env=env,
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                self.stderr.write(self.style.ERROR(f"pg_dump failed:\n{result.stderr}"))
                return
        elif "sqlite" in engine:
            filename += ".sqlite3"
            filepath = backup_dir / filename
            db_path = db_settings["NAME"]
            import shutil
            shutil.copy2(db_path, filepath)
        else:
            self.stderr.write(self.style.ERROR(f"Unsupported database engine: {engine}"))
            return

        self.stdout.write(self.style.SUCCESS(f"Backup created: {filepath}"))
