import { useEffect, useState, useRef, useCallback } from "react";
import { isAxiosError } from "axios";
import {
  View, Text, Pressable, ScrollView, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../../../src/theme/ThemeProvider";
import { Button, TextField, Card, Chip, Divider, Stepper, AnimatedStepContent } from "../../../src/components/ui";
import { reportsApi } from "../../../src/api/reports";
import { categoriesApi } from "../../../src/api/categories";
import { locationsApi } from "../../../src/api/locations";
import type { Campus, Department, IncidentCategory, SuspectType, VictimGender } from "../../../src/types";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import {
  getAssetName,
  getMediaUploadError,
  getMediaValidationMessage,
  MAX_MEDIA_SIZE_BYTES,
  type MediaErrorMessage,
  type SelectedMedia,
} from "../../../src/utils/mediaValidation";
import { reporterWizardTitle } from "../../../src/utils/reporterScreenCopy";

function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const STEPS = [
  { label: "Type" },
  { label: "Location" },
  { label: "Details" },
  { label: "Victim" },
  { label: "Suspect" },
  { label: "Witnesses" },
  { label: "Evidence" },
  { label: "Review" },
];

type SelectMenu = "campus" | "department" | "gender" | "suspectType" | "suspectCampus" | "suspectDepartment" | null;

interface WizardData {
  categoryId: string;
  campusId: string;
  departmentId: string;
  locationText: string;
  incidentDate: Date;
  description: string;
  isVictimSelf: boolean;
  victimName: string;
  victimContact: string;
  victimGender: VictimGender | "";
  suspectKnown: boolean;
  suspectType: SuspectType | "";
  suspectName: string;
  suspectIdentifier: string;
  suspectRelationship: string;
  suspectCampusId: string;
  suspectDepartmentId: string;
  suspectNotes: string;
  witnesses: { name: string; contact: string }[];
  evidence: { uri: string; name: string; type: string; size: number }[];
  consentToContact: boolean;
  needsImmediateHelp: boolean;
}

const initialData: WizardData = {
  categoryId: "", campusId: "", departmentId: "", locationText: "",
  incidentDate: new Date(), description: "", isVictimSelf: true,
  victimName: "", victimContact: "", victimGender: "", suspectKnown: false,
  suspectType: "", suspectName: "", suspectIdentifier: "", suspectRelationship: "",
  suspectCampusId: "", suspectDepartmentId: "", suspectNotes: "", witnesses: [],
  evidence: [], consentToContact: false, needsImmediateHelp: false,
};

function SelectField({ label, value, placeholder, onPress, disabled = false }: { label: string; value?: string; placeholder: string; onPress: () => void; disabled?: boolean }) {
  return <View style={styles.selectField}><Text style={styles.selectLabel}>{label}</Text><Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.selectControl, disabled && styles.selectDisabled, pressed && !disabled && styles.selectPressed]}><Text numberOfLines={1} style={[styles.selectValue, !value && styles.selectPlaceholder]}>{value || placeholder}</Text><Ionicons name="chevron-down" size={19} color={disabled ? "#A9A1AB" : "#7E36B7"} /></Pressable></View>;
}

function SelectionList({ options, selectedId, onSelect, emptyText }: { options: { id: string; label: string; detail?: string }[]; selectedId: string; onSelect: (id: string) => void; emptyText: string }) {
  if (!options.length) return <View style={styles.selectEmpty}><Text style={styles.selectEmptyText}>{emptyText}</Text></View>;
  return <View style={styles.selectMenu}>{options.map((option) => <Pressable key={option.id} onPress={() => onSelect(option.id)} style={({ pressed }) => [styles.selectOption, selectedId === option.id && styles.selectOptionActive, pressed && styles.selectPressed]}><View style={{ flex: 1 }}><Text style={[styles.selectOptionText, selectedId === option.id && styles.selectOptionTextActive]}>{option.label}</Text>{option.detail ? <Text style={styles.selectOptionDetail}>{option.detail}</Text> : null}</View>{selectedId === option.id ? <Ionicons name="checkmark" size={19} color="#813BBC" /> : null}</Pressable>)}</View>;
}


export default function ReportWizard() {
  const router = useRouter();
  const { draftId } = useLocalSearchParams<{ draftId: string }>();
  const { scheme, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [mediaError, setMediaError] = useState<MediaErrorMessage | null>(null);
  const [draftReport, setDraftReport] = useState<{ id: string; caseNumber?: string | null } | null>(null);
  const [uploadedEvidenceUris, setUploadedEvidenceUris] = useState<string[]>([]);
  const [openSelect, setOpenSelect] = useState<SelectMenu>(null);

  // Incident categories are server-authoritative: the option cards must use
  // the real backend UUIDs (the API rejects fake slug ids with a 400).
  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const categoryOptions = Array.isArray(categories) ? categories : [];
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [suspectDepartments, setSuspectDepartments] = useState<Department[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    categoriesApi.list()
      .then((cats) => { if (mounted) setCategories(Array.isArray(cats) ? cats : []); })
      .catch(() => { if (mounted) setCategories([]); })
      .finally(() => { if (mounted) setCategoriesLoading(false); });
    return () => { mounted = false; };
  }, []);

  const update = useCallback(<K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    let mounted = true;
    locationsApi.campuses()
      .then((items) => { if (mounted) setCampuses(items); })
      .catch(() => { if (mounted) setCampuses([]); })
      .finally(() => { if (mounted) setLocationsLoading(false); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!data.campusId) { setDepartments([]); return () => { mounted = false; }; }
    locationsApi.departments(data.campusId)
      .then((items) => { if (mounted) setDepartments(items); })
      .catch(() => { if (mounted) setDepartments([]); });
    return () => { mounted = false; };
  }, [data.campusId]);

  useEffect(() => {
    let mounted = true;
    if (!data.suspectCampusId) { setSuspectDepartments([]); return () => { mounted = false; }; }
    locationsApi.departments(data.suspectCampusId)
      .then((items) => { if (mounted) setSuspectDepartments(items); })
      .catch(() => { if (mounted) setSuspectDepartments([]); });
    return () => { mounted = false; };
  }, [data.suspectCampusId]);

  const validateStep = (): string | null => {
    switch (step) {
      case 0: return data.categoryId ? null : "Please select an incident type";
      case 1:
        if (!data.campusId) return "Please select your campus";
        return data.departmentId ? null : "Please select your department";
      case 2: return data.description.length >= 20 ? null : "Description must be at least 20 characters";
      case 3:
        if (!data.victimGender) return "Please select a gender option";
        return data.isVictimSelf || data.victimName ? null : "Please provide victim details";
      default: return null;
    }
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) { Alert.alert("Required", error); return; }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }
  };

  const buildReportPayload = () => ({
    category: data.categoryId,
    campus_option: data.campusId,
    department_option: data.departmentId,
    location_text: data.locationText,
    incident_date: toDateInput(data.incidentDate),
    description: data.description,
    victim_is_reporter: data.isVictimSelf,
    victim_details: data.isVictimSelf ? {} : { name: data.victimName, contact: data.victimContact },
    victim_gender: data.victimGender,
    offender_known: data.suspectKnown,
    offender_details: data.suspectKnown ? { name: data.suspectName, relationship: data.suspectRelationship } : {},
    suspect_type: data.suspectKnown ? data.suspectType : "",
    suspect_campus: data.suspectKnown && data.suspectCampusId ? data.suspectCampusId : null,
    suspect_department: data.suspectKnown && data.suspectDepartmentId ? data.suspectDepartmentId : null,
    suspect_details: data.suspectKnown ? {
      name: data.suspectName,
      identifier: data.suspectIdentifier,
      relationship: data.suspectRelationship,
      notes: data.suspectNotes,
    } : {},
    witnesses: data.witnesses.filter((w) => w.name.trim() || w.contact.trim()),
    needs_immediate_help: data.needsImmediateHelp,
    consent_to_contact: data.consentToContact,
  });

  const handleSaveDraft = async () => {
    try {
      const report = await reportsApi.create(buildReportPayload());
      setDraftReport({ id: report.id, caseNumber: report.case_number });
      Alert.alert("Draft Saved", "Your report has been saved securely. You can continue when ready.");
    } catch {
      Alert.alert("Could not save draft", "Please check your connection and try again.");
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setMediaError(null);
    try {
      const report = draftReport
        ? await reportsApi.get(draftReport.id)
        : await reportsApi.create(buildReportPayload());
      setDraftReport({ id: report.id, caseNumber: report.case_number });

      const uploadedUris = new Set(uploadedEvidenceUris);
      const pendingFiles = data.evidence.filter((file) => !uploadedUris.has(file.uri));
      setUploadProgress(Object.fromEntries(pendingFiles.map((file) => [file.uri, 0])));

      for (const file of pendingFiles) {
        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.type,
        } as any);

        try {
          await reportsApi.uploadEvidence(report.id, formData);
          uploadedUris.add(file.uri);
          setUploadedEvidenceUris(Array.from(uploadedUris));
          setUploadProgress((current) => ({ ...current, [file.uri]: 100 }));
        } catch (error) {
          const uploadError = getMediaUploadError(error);
          setMediaError({
            title: uploadError.title,
            message: `${file.name}: ${uploadError.message}`,
          });
          setUploadProgress({});
          setStep(6);
          return;
        }
      }

      setUploadProgress({});
      try {
        await reportsApi.submit(report.id);
      } catch (error) {
        // Older backend versions could persist SUBMITTED before a Celery
        // notification dispatch failed. Confirm state before showing failure.
        const status = isAxiosError(error) ? error.response?.status : undefined;
        if (status && status >= 500) {
          const current = await reportsApi.get(report.id);
          if (current.status === "submitted") {
            router.replace(`/reports/success?caseNumber=${current.case_number || report.case_number || ""}&reportId=${current.id}`);
            return;
          }
        }
        throw error;
      }
      router.replace(`/reports/success?caseNumber=${report.case_number || ""}&reportId=${report.id}`);
    } catch (err) {
      Alert.alert(
        "Submission Failed",
        err instanceof Error ? err.message : "Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPickedMedia = (files: SelectedMedia[]) => {
    const rejected: string[] = [];
    const accepted = files.filter((file) => {
      const validationMessage = getMediaValidationMessage(file);
      if (validationMessage) rejected.push(validationMessage);
      return !validationMessage;
    });

    if (accepted.length > 0) {
      update("evidence", [...data.evidence, ...accepted]);
    }
    if (rejected.length > 0) {
      setMediaError({
        title: accepted.length > 0 ? "Some files were not added" : "File type not supported",
        message: rejected.join("\\n"),
      });
    }
  };

  const pickEvidence = async () => {
    setMediaError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
      });
      if (result.canceled) return;

      const files: SelectedMedia[] = result.assets.map((asset) => {
        const pickerType = (asset as { mimeType?: string }).mimeType
          || (asset.type === "video" ? "video/mp4" : "image/jpeg");
        return {
          uri: asset.uri,
          name: getAssetName(asset.uri, asset.fileName, asset.type),
          type: pickerType,
          size: asset.fileSize || 0,
        };
      });
      addPickedMedia(files);
    } catch {
      setMediaError({ title: "Could not open your media library", message: "Please check the app permission and try again." });
    }
  };

  const pickDocument = async () => {
    setMediaError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ multiple: true });
      if (result.canceled) return;

      const files: SelectedMedia[] = result.assets.map((asset) => ({
        uri: asset.uri,
        name: getAssetName(asset.uri, asset.name, asset.mimeType),
        type: asset.mimeType || "",
        size: asset.size || 0,
      }));
      addPickedMedia(files);
    } catch {
      setMediaError({ title: "Could not open your documents", message: "Please check the app permission and try again." });
    }
  };

  const removeEvidence = (index: number) => {
    const removedUri = data.evidence[index]?.uri;
    setData((prev) => ({ ...prev, evidence: prev.evidence.filter((_, i) => i !== index) }));
    if (removedUri) {
      setUploadedEvidenceUris((current) => current.filter((uri) => uri !== removedUri));
    }
  };

  const addWitness = () => {
    setData((prev) => ({ ...prev, witnesses: [...prev.witnesses, { name: "", contact: "" }] }));
  };

  const updateWitness = (index: number, key: "name" | "contact", value: string) => {
    setData((prev) => {
      const w = [...prev.witnesses];
      w[index] = { ...w[index], [key]: value };
      return { ...prev, witnesses: w };
    });
  };

  const removeWitness = (index: number) => {
    setData((prev) => ({ ...prev, witnesses: prev.witnesses.filter((_, i) => i !== index) }));
  };

  const renderStep = () => {
    switch (step) {
      case 0: return (
        <View>
          <Text style={[typography.title.medium, { color: scheme.onBackground, marginBottom: spacing.xs }]}>Incident Type</Text>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.md }]}>Select the category that best describes what happened.</Text>
          {categoriesLoading ? (
            <ActivityIndicator size="large" color={scheme.primary} style={{ marginTop: spacing.xl }} />
          ) : categoryOptions.length === 0 ? (
            <View style={[styles.alertCard, { backgroundColor: scheme.warningContainer, borderRadius: borderRadius.md }]}>
              <Ionicons name="information-circle" size={20} color={scheme.onWarning} />
              <Text style={[typography.body.small, { color: scheme.onWarning, marginLeft: 8, flex: 1 }]}>
                Incident types are temporarily unavailable. Please try again shortly or contact the support office if you need immediate help.
              </Text>
            </View>
          ) : (
            categoryOptions.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => update("categoryId", cat.id)}
                style={[styles.optionCard, {
                  backgroundColor: data.categoryId === cat.id ? scheme.primaryContainer : scheme.surface,
                  borderRadius: borderRadius.lg,
                  borderColor: data.categoryId === cat.id ? scheme.primary : scheme.outlineVariant,
                  borderWidth: data.categoryId === cat.id ? 2 : 1,
                }]}
              >
                <Text style={[typography.title.small, { color: data.categoryId === cat.id ? scheme.onPrimaryContainer : scheme.onSurface }]}>{cat.name}</Text>
                <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginTop: 2 }]}>{cat.description}</Text>
              </Pressable>
            ))
          )}
        </View>
      );

      case 1: return (
        <View>
          <Text style={[typography.title.medium, { color: scheme.onBackground, marginBottom: spacing.xs }]}>Location & Date</Text>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.md }]}>Choose the campus and department where this happened. These options are managed by the safeguarding office.</Text>
          {locationsLoading ? <ActivityIndicator size="small" color={scheme.primary} style={{ marginVertical: spacing.md }} /> : campuses.length === 0 ? <View style={[styles.alertCard, { backgroundColor: scheme.warningContainer, borderRadius: borderRadius.md }]}><Ionicons name="information-circle" size={20} color={scheme.onWarning} /><Text style={[typography.body.small, { color: scheme.onWarning, marginLeft: 8, flex: 1 }]}>Locations are not available yet. Please contact the safeguarding office for support.</Text></View> : <>
            <SelectField label="Campus" value={campuses.find((item) => item.id === data.campusId)?.name} placeholder="Select campus" onPress={() => setOpenSelect(openSelect === "campus" ? null : "campus")} />
            {openSelect === "campus" ? <SelectionList options={campuses.map((item) => ({ id: item.id, label: item.name, detail: item.code || undefined }))} selectedId={data.campusId} onSelect={(id) => { update("campusId", id); update("departmentId", ""); setOpenSelect(null); }} emptyText="No campuses are configured." /> : null}
            <SelectField label="Department / Faculty" value={departments.find((item) => item.id === data.departmentId)?.name} placeholder={data.campusId ? "Select department" : "Select campus first"} disabled={!data.campusId} onPress={() => setOpenSelect(openSelect === "department" ? null : "department")} />
            {openSelect === "department" ? <SelectionList options={departments.map((item) => ({ id: item.id, label: item.name, detail: item.code || undefined }))} selectedId={data.departmentId} onSelect={(id) => { update("departmentId", id); setOpenSelect(null); }} emptyText="No departments are configured for this campus." /> : null}
          </>}
          <TextField label="Specific location (optional)" value={data.locationText} onChangeText={(v) => update("locationText", v)} containerStyle={{ marginBottom: spacing.sm }} />
          <Pressable onPress={() => setShowDatePicker(true)} style={[styles.dateButton, { borderColor: scheme.outline, borderRadius: borderRadius.md }]}>
            <Ionicons name="calendar-outline" size={20} color={scheme.onSurfaceVariant} />
            <Text style={[typography.body.large, { color: scheme.onSurface, marginLeft: spacing.sm }]}>
              {data.incidentDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </Text>
          </Pressable>
          {showDatePicker && (
            <DateTimePicker
              value={data.incidentDate}
              mode="date"
              maximumDate={new Date()}
              onChange={(event, date) => { setShowDatePicker(false); if (date) update("incidentDate", date); }}
            />
          )}
        </View>
      );

      case 2: return (
        <View>
          <Text style={[typography.title.medium, { color: scheme.onBackground, marginBottom: spacing.xs }]}>Incident Details</Text>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.md }]}>Describe what happened in your own words. Include as much detail as you feel comfortable sharing.</Text>
          <View style={[styles.textArea, { borderColor: scheme.outline, borderRadius: borderRadius.md }]}>
            <TextInput
              value={data.description}
              onChangeText={(v) => update("description", v)}
              placeholder="Describe what happened..."
              placeholderTextColor={scheme.onSurfaceVariant}
              multiline
              numberOfLines={8}
              style={[typography.body.large, { color: scheme.onSurface, minHeight: 160, textAlignVertical: "top", padding: spacing.md }]}
              maxLength={2000}
            />
            <View style={[styles.charCount, { borderTopColor: scheme.outlineVariant }]}>
              <Text style={[typography.label.small, { color: data.description.length > 1900 ? scheme.error : scheme.onSurfaceVariant }]}>
                {data.description.length}/2000
              </Text>
            </View>
          </View>
          <View style={[styles.alertCard, { backgroundColor: scheme.tertiaryContainer, borderRadius: borderRadius.md, marginTop: spacing.md }]}>
            <Ionicons name="information-circle" size={18} color={scheme.onTertiaryContainer} />
            <Text style={[typography.body.small, { color: scheme.onTertiaryContainer, marginLeft: 8, flex: 1 }]}>
              You do not need to include identifying information unless you want to. Share only what feels right for you.
            </Text>
          </View>
        </View>
      );

      case 3: return (
        <View>
          <Text style={[typography.title.medium, { color: scheme.onBackground, marginBottom: spacing.xs }]}>Victim Information</Text>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.md }]}>Are you reporting on your own behalf or someone else's? Gender is collected only to help the safeguarding team understand patterns of harm.</Text>
          <SelectField label="Gender" value={({ female: "Girl / woman", male: "Boy / man", non_binary: "Non-binary / another identity", self_describe: "Self-describe", prefer_not_to_say: "Prefer not to say" } as Record<string, string>)[data.victimGender]} placeholder="Select an option" onPress={() => setOpenSelect(openSelect === "gender" ? null : "gender")} />
          {openSelect === "gender" ? <SelectionList options={[{ id: "female", label: "Girl / woman" }, { id: "male", label: "Boy / man" }, { id: "non_binary", label: "Non-binary / another identity" }, { id: "self_describe", label: "Self-describe" }, { id: "prefer_not_to_say", label: "Prefer not to say" }]} selectedId={data.victimGender} onSelect={(id) => { update("victimGender", id as VictimGender); setOpenSelect(null); }} emptyText="No options available." /> : null}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: spacing.lg }}>
            <Pressable onPress={() => { update("isVictimSelf", true); update("victimName", ""); }} style={[styles.toggleBtn, { flex: 1, borderRadius: borderRadius.md, borderColor: data.isVictimSelf ? scheme.primary : scheme.outline, borderWidth: data.isVictimSelf ? 2 : 1, backgroundColor: data.isVictimSelf ? scheme.primaryContainer : scheme.surface }]}>
              <Ionicons name="person" size={20} color={data.isVictimSelf ? scheme.primary : scheme.onSurfaceVariant} />
              <Text style={[typography.label.large, { color: data.isVictimSelf ? scheme.onPrimaryContainer : scheme.onSurfaceVariant, marginTop: 4 }]}>This happened to me</Text>
            </Pressable>
            <Pressable onPress={() => { update("isVictimSelf", false); }} style={[styles.toggleBtn, { flex: 1, borderRadius: borderRadius.md, borderColor: !data.isVictimSelf ? scheme.primary : scheme.outline, borderWidth: !data.isVictimSelf ? 2 : 1, backgroundColor: !data.isVictimSelf ? scheme.primaryContainer : scheme.surface }]}>
              <Ionicons name="people" size={20} color={!data.isVictimSelf ? scheme.primary : scheme.onSurfaceVariant} />
              <Text style={[typography.label.large, { color: !data.isVictimSelf ? scheme.onPrimaryContainer : scheme.onSurfaceVariant, marginTop: 4 }]}>Someone else</Text>
            </Pressable>
          </View>
          {!data.isVictimSelf && (
            <>
              <TextField label="Victim's Name" value={data.victimName} onChangeText={(v) => update("victimName", v)} containerStyle={{ marginBottom: spacing.sm }} />
              <TextField label="Victim's Contact (optional)" value={data.victimContact} onChangeText={(v) => update("victimContact", v)} containerStyle={{ marginBottom: spacing.sm }} />
            </>
          )}
        </View>
      );

      case 4: return (
        <View>
          <Text style={[typography.title.medium, { color: scheme.onBackground, marginBottom: spacing.xs }]}>Suspect Details</Text>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.md }]}>This step is optional. Share only details you know and feel safe providing.</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: spacing.lg }}>
            <Pressable onPress={() => update("suspectKnown", true)} style={[styles.toggleBtn, { flex: 1, borderRadius: borderRadius.md, borderColor: data.suspectKnown ? scheme.primary : scheme.outline, borderWidth: data.suspectKnown ? 2 : 1, backgroundColor: data.suspectKnown ? scheme.primaryContainer : scheme.surface }]}>
              <Text style={[typography.label.large, { color: data.suspectKnown ? scheme.onPrimaryContainer : scheme.onSurfaceVariant }]}>Add details</Text>
            </Pressable>
            <Pressable onPress={() => update("suspectKnown", false)} style={[styles.toggleBtn, { flex: 1, borderRadius: borderRadius.md, borderColor: !data.suspectKnown ? scheme.primary : scheme.outline, borderWidth: !data.suspectKnown ? 2 : 1, backgroundColor: !data.suspectKnown ? scheme.primaryContainer : scheme.surface }]}>
              <Text style={[typography.label.large, { color: !data.suspectKnown ? scheme.onPrimaryContainer : scheme.onSurfaceVariant }]}>Skip for now</Text>
            </Pressable>
          </View>
          {data.suspectKnown && (
            <>
              <SelectField label="Suspect type" value={({ student: "Student", lecturer: "Lecturer", staff: "Staff member", visitor: "Visitor", other: "Other / not sure" } as Record<string, string>)[data.suspectType]} placeholder="Select if known" onPress={() => setOpenSelect(openSelect === "suspectType" ? null : "suspectType")} />
              {openSelect === "suspectType" ? <SelectionList options={[{ id: "student", label: "Student" }, { id: "lecturer", label: "Lecturer" }, { id: "staff", label: "Staff member" }, { id: "visitor", label: "Visitor" }, { id: "other", label: "Other / not sure" }]} selectedId={data.suspectType} onSelect={(id) => { update("suspectType", id as SuspectType); setOpenSelect(null); }} emptyText="No options available." /> : null}
              <TextField label="Name (if known)" value={data.suspectName} onChangeText={(v) => update("suspectName", v)} containerStyle={{ marginBottom: spacing.sm }} />
              <TextField label="Student / staff ID (if known)" value={data.suspectIdentifier} onChangeText={(v) => update("suspectIdentifier", v)} containerStyle={{ marginBottom: spacing.sm }} />
              <TextField label="Connection to the incident (optional)" value={data.suspectRelationship} onChangeText={(v) => update("suspectRelationship", v)} containerStyle={{ marginBottom: spacing.sm }} />
              <SelectField label="Suspect campus (optional)" value={campuses.find((item) => item.id === data.suspectCampusId)?.name} placeholder="Select if known" onPress={() => setOpenSelect(openSelect === "suspectCampus" ? null : "suspectCampus")} />
              {openSelect === "suspectCampus" ? <SelectionList options={campuses.map((item) => ({ id: item.id, label: item.name, detail: item.code || undefined }))} selectedId={data.suspectCampusId} onSelect={(id) => { update("suspectCampusId", id); update("suspectDepartmentId", ""); setOpenSelect(null); }} emptyText="No campuses are configured." /> : null}
              <SelectField label="Suspect department (optional)" value={suspectDepartments.find((item) => item.id === data.suspectDepartmentId)?.name} placeholder={data.suspectCampusId ? "Select if known" : "Select campus first"} disabled={!data.suspectCampusId} onPress={() => setOpenSelect(openSelect === "suspectDepartment" ? null : "suspectDepartment")} />
              {openSelect === "suspectDepartment" ? <SelectionList options={suspectDepartments.map((item) => ({ id: item.id, label: item.name, detail: item.code || undefined }))} selectedId={data.suspectDepartmentId} onSelect={(id) => { update("suspectDepartmentId", id); setOpenSelect(null); }} emptyText="No departments are configured for this campus." /> : null}
              <TextField label="Anything else that may help identify them (optional)" value={data.suspectNotes} onChangeText={(v) => update("suspectNotes", v)} containerStyle={{ marginBottom: spacing.sm }} />
            </>
          )}
        </View>
      );

      case 5: return (
        <View>
          <Text style={[typography.title.medium, { color: scheme.onBackground, marginBottom: spacing.xs }]}>Witnesses</Text>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.md }]}>Add a witness only if they have agreed to be contacted or you believe it is safe to share their details.</Text>
          <Text style={[typography.title.small, { color: scheme.onBackground, marginBottom: spacing.sm }]}>Witnesses</Text>
          {data.witnesses.map((w, i) => (
            <View key={i} style={[styles.witnessRow, { borderRadius: borderRadius.md, borderColor: scheme.outlineVariant }]}>
              <View style={{ flex: 1 }}>
                <TextField label="Name" value={w.name} onChangeText={(v) => updateWitness(i, "name", v)} containerStyle={{ marginBottom: 4 }} />
                <TextField label="Contact (optional)" value={w.contact} onChangeText={(v) => updateWitness(i, "contact", v)} />
              </View>
              <Pressable onPress={() => removeWitness(i)} style={{ padding: 8 }}>
                <Ionicons name="close-circle" size={22} color={scheme.error} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={addWitness} style={[styles.addBtn, { borderColor: scheme.primary, borderRadius: borderRadius.md }]}>
            <Ionicons name="add" size={18} color={scheme.primary} />
            <Text style={[typography.label.large, { color: scheme.primary, marginLeft: 6 }]}>Add Witness</Text>
          </Pressable>
        </View>
      );

      case 6: return (
        <View>
          <Text style={[typography.title.medium, { color: scheme.onBackground, marginBottom: spacing.xs }]}>Evidence</Text>
          <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant, marginBottom: spacing.md }]}>Upload any evidence you have — photos, screenshots, documents, or recordings. You can also skip this and add evidence later.</Text>
          <View style={[styles.mediaHint, { backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.md, marginBottom: spacing.sm }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={scheme.primary} />
            <Text style={[typography.body.small, { color: scheme.onSurfaceVariant, marginLeft: 8, flex: 1 }]}>Accepted: JPG, PNG, GIF, WEBP, PDF, MP4, MOV, MP3, WAV, OGG, DOC, DOCX, TXT. Maximum {Math.round(MAX_MEDIA_SIZE_BYTES / 1024 / 1024)} MB per file.</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: spacing.md }}>
            <Pressable onPress={pickEvidence} style={[styles.evidenceBtn, { flex: 1, borderColor: scheme.outline, borderRadius: borderRadius.md }]}>
              <Ionicons name="image-outline" size={24} color={scheme.primary} />
              <Text style={[typography.label.medium, { color: scheme.primary, marginTop: 4 }]}>Photos / Videos</Text>
            </Pressable>
            <Pressable onPress={pickDocument} style={[styles.evidenceBtn, { flex: 1, borderColor: scheme.outline, borderRadius: borderRadius.md }]}>
              <Ionicons name="document-outline" size={24} color={scheme.primary} />
              <Text style={[typography.label.medium, { color: scheme.primary, marginTop: 4 }]}>Documents</Text>
            </Pressable>
          </View>
          {mediaError && (
            <View style={[styles.mediaErrorCard, { backgroundColor: scheme.errorContainer, borderColor: scheme.error, borderRadius: borderRadius.md, marginBottom: spacing.md }]} accessibilityRole="alert">
              <Ionicons name="alert-circle" size={22} color={scheme.error} />
              <View style={{ flex: 1, marginLeft: spacing.sm }}>
                <Text style={[typography.title.small, { color: scheme.onErrorContainer }]}>{mediaError.title}</Text>
                <Text style={[typography.body.small, { color: scheme.onErrorContainer, marginTop: 3 }]}>{mediaError.message}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: spacing.sm }}>
                  <Pressable onPress={handleSubmit} disabled={isSubmitting} style={({ pressed }) => [styles.retryUploadButton, { borderColor: scheme.error, opacity: isSubmitting ? 0.5 : pressed ? 0.7 : 1 }]}>
                    <Ionicons name="refresh-outline" size={15} color={scheme.error} />
                    <Text style={[typography.label.medium, { color: scheme.error, marginLeft: 5 }]}>Retry Upload</Text>
                  </Pressable>
                  <Pressable onPress={() => setMediaError(null)} style={{ padding: 6, marginLeft: spacing.sm }}>
                    <Text style={[typography.label.medium, { color: scheme.onErrorContainer }]}>Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
          {Object.keys(uploadProgress).length > 0 && (
            <View style={[styles.mediaProgress, { backgroundColor: scheme.primaryContainer, borderRadius: borderRadius.md, marginBottom: spacing.md }]}>
              <ActivityIndicator size="small" color={scheme.primary} />
              <Text style={[typography.body.small, { color: scheme.onPrimaryContainer, marginLeft: spacing.sm }]}>Uploading evidence securely…</Text>
            </View>
          )}
          {data.evidence.length > 0 && (
            <View style={{ gap: 8 }}>
              {data.evidence.map((file, i) => (
                <View key={i} style={[styles.fileRow, { backgroundColor: scheme.surfaceVariant, borderRadius: borderRadius.md }]}>
                  {file.type?.startsWith("image") ? (
                    <Image source={{ uri: file.uri }} style={{ width: 36, height: 36, borderRadius: 4 }} />
                  ) : (
                    <Ionicons name="document-outline" size={20} color={scheme.onSurfaceVariant} />
                  )}
                  <Text style={[typography.body.small, { color: scheme.onSurface, flex: 1, marginLeft: 8 }]} numberOfLines={1}>{file.name}</Text>
                  <Text style={[typography.label.small, { color: scheme.onSurfaceVariant, marginRight: 8 }]}>
                    {(file.size / 1024 / 1024).toFixed(1)}MB
                  </Text>
                  <Pressable onPress={() => removeEvidence(i)}>
                    <Ionicons name="trash-outline" size={18} color={scheme.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
          <Divider />
          <Pressable onPress={() => update("needsImmediateHelp", !data.needsImmediateHelp)} style={[styles.checkRow, { marginTop: spacing.sm }]}>
            <Ionicons name={data.needsImmediateHelp ? "checkbox" : "square-outline"} size={22} color={data.needsImmediateHelp ? scheme.error : scheme.onSurfaceVariant} />
            <Text style={[typography.body.medium, { color: scheme.onSurface, marginLeft: 8, flex: 1 }]}>I need immediate help or support</Text>
          </Pressable>
          {data.needsImmediateHelp && (
            <View style={[styles.alertCard, { backgroundColor: scheme.errorContainer, borderRadius: borderRadius.md, marginTop: spacing.sm }]}>
              <Ionicons name="heart" size={18} color={scheme.error} />
              <Text style={[typography.body.small, { color: scheme.onErrorContainer, marginLeft: 8, flex: 1 }]}>
                You are not alone. Please reach out to the National GBV Helpline at 0800-GBV-HELP or call 911 if you are in immediate danger.
              </Text>
            </View>
          )}
          <Pressable onPress={() => update("consentToContact", !data.consentToContact)} style={[styles.checkRow, { marginTop: spacing.sm }]}>
            <Ionicons name={data.consentToContact ? "checkbox" : "square-outline"} size={22} color={data.consentToContact ? scheme.primary : scheme.onSurfaceVariant} />
            <Text style={[typography.body.medium, { color: scheme.onSurface, marginLeft: 8, flex: 1 }]}>I consent to be contacted about this report through this platform</Text>
          </Pressable>
        </View>
      );

      case 7: return (
        <View>
          <Text style={[typography.title.medium, { color: scheme.onBackground, marginBottom: spacing.lg }]}>Review & Submit</Text>
          <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Type</Text>
            <Text style={[typography.body.large, { color: scheme.onSurface }]}>{categoryOptions.find((c) => c.id === data.categoryId)?.name || "Not selected"}</Text>
          </Card>
          <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Location & Date</Text>
            <Text style={[typography.body.large, { color: scheme.onSurface }]}>{campuses.find((item) => item.id === data.campusId)?.name || "Not selected"}{data.departmentId ? `, ${departments.find((item) => item.id === data.departmentId)?.name || ""}` : ""}</Text>
            <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>{data.incidentDate.toLocaleDateString()}</Text>
          </Card>
          <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Description</Text>
            <Text style={[typography.body.large, { color: scheme.onSurface }]} numberOfLines={5}>{data.description}</Text>
          </Card>
          <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Victim</Text>
            <Text style={[typography.body.large, { color: scheme.onSurface }]}>{data.isVictimSelf ? "Self" : data.victimName}</Text>
            <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>{({ female: "Girl / woman", male: "Boy / man", non_binary: "Non-binary / another identity", self_describe: "Self-describe", prefer_not_to_say: "Prefer not to say" } as Record<string, string>)[data.victimGender] || "Not shared"}</Text>
          </Card>
          {data.suspectKnown && (
            <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
              <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Suspect details</Text>
              <Text style={[typography.body.large, { color: scheme.onSurface }]}>{data.suspectName || "Details shared without a name"}</Text>
              <Text style={[typography.body.medium, { color: scheme.onSurfaceVariant }]}>{({ student: "Student", lecturer: "Lecturer", staff: "Staff member", visitor: "Visitor", other: "Other / not sure" } as Record<string, string>)[data.suspectType] || "Type not shared"}</Text>
            </Card>
          )}
          <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
            <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Evidence</Text>
            <Text style={[typography.body.large, { color: scheme.onSurface }]}>{data.evidence.length} file(s) attached</Text>
          </Card>
          {data.witnesses.length > 0 && (
            <Card variant="filled" padding="md" style={{ marginBottom: spacing.sm }}>
              <Text style={[typography.label.medium, { color: scheme.onSurfaceVariant }]}>Witnesses</Text>
              <Text style={[typography.body.large, { color: scheme.onSurface }]}>{data.witnesses.length} witness(es)</Text>
            </Card>
          )}
          <View style={[styles.alertCard, { backgroundColor: scheme.primaryContainer, borderRadius: borderRadius.md, marginTop: spacing.md }]}>
            <Ionicons name="shield-checkmark" size={20} color={scheme.onPrimaryContainer} />
            <Text style={[typography.body.small, { color: scheme.onPrimaryContainer, marginLeft: 8, flex: 1 }]}>
              Your report will be handled confidentially. Once submitted, you cannot edit it but you can add more information later.
            </Text>
          </View>
          {!data.consentToContact && (
            <View style={[styles.alertCard, { backgroundColor: scheme.errorContainer, borderRadius: borderRadius.md, marginTop: spacing.sm }]}>
              <Ionicons name="warning" size={18} color={scheme.error} />
              <Text style={[typography.body.small, { color: scheme.onErrorContainer, marginLeft: 8, flex: 1 }]}>
                Without consent to contact, we may not be able to follow up on your report.
              </Text>
            </View>
          )}
          <View style={{ gap: 8, marginTop: spacing.lg }}>
            <Button title="Submit Report" variant="filled" size="lg" onPress={handleSubmit} loading={isSubmitting} style={{ width: "100%" }} />
            <Button title="Save as Draft" variant="tonal" size="lg" onPress={handleSaveDraft} style={{ width: "100%" }} />
          </View>
        </View>
      );

      default: return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View pointerEvents="none" style={styles.lilacArc}><View style={styles.lilacArcInner} /></View>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={31} color="#141115" />
        </Pressable>
        <Pressable onPress={handleSaveDraft} style={styles.saveButton}>
          <Text style={styles.saveText}>Save draft</Text>
        </Pressable>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.wizardTitle}>{reporterWizardTitle}</Text>
        <View style={styles.progressMeta}>
          <Text style={styles.progressLabel}>{STEPS[step].label}</Text>
          <Text style={styles.progressCount}>{step + 1} / {STEPS.length}</Text>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((step + 1) / STEPS.length) * 100}%` }]} /></View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AnimatedStepContent stepKey={step}>
            {renderStep()}
          </AnimatedStepContent>
        </ScrollView>
      </KeyboardAvoidingView>

      {step < STEPS.length - 1 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.footerActions}>
            {step > 0 && (
              <Pressable onPress={() => setStep((s) => s - 1)} style={styles.backAction}><Text style={styles.backActionText}>Back</Text></Pressable>
            )}
            <Pressable onPress={handleNext} style={[styles.nextAction, step === 0 && styles.nextActionSolo]}><Text style={styles.nextActionText}>Next</Text><Ionicons name="arrow-forward" size={21} color="#FFFFFF" /></Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEFDFE", overflow: "hidden" },
  lilacArc: { position: "absolute", width: 620, height: 430, top: -250, left: -205, backgroundColor: "#E1C1FC", borderRadius: 310, opacity: 0.92 },
  lilacArcInner: { position: "absolute", width: 540, height: 370, left: 90, top: 105, backgroundColor: "#F7EBFF", borderRadius: 270, opacity: 0.76 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 32, paddingTop: 42, minHeight: 86 },
  closeButton: { padding: 4 },
  saveButton: { paddingVertical: 8, paddingHorizontal: 10 },
  saveText: { color: "#7E36B7", fontSize: 13.5, fontWeight: "800" },
  titleBlock: { paddingHorizontal: 36, paddingTop: 15, paddingBottom: 20 },
  wizardTitle: { color: "#070707", fontSize: 34, lineHeight: 38, fontWeight: "700", letterSpacing: -1.35 },
  progressMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 15 },
  progressLabel: { color: "#7E36B7", fontSize: 13, fontWeight: "800" },
  progressCount: { color: "#817B84", fontSize: 12.5, fontWeight: "700" },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: "#E9DFEE", overflow: "hidden", marginTop: 8 },
  progressFill: { height: "100%", borderRadius: 2, backgroundColor: "#A95BEA" },
  scrollContent: { paddingHorizontal: 36, paddingTop: 8, paddingBottom: 36 },
  selectField: { marginBottom: 11 },
  selectLabel: { color: "#413A45", fontSize: 12.5, fontWeight: "800", marginLeft: 4, marginBottom: 7 },
  selectControl: { minHeight: 57, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.25, borderColor: "#B7AFBA", borderRadius: 28.5, backgroundColor: "rgba(255,255,255,0.76)", paddingHorizontal: 19 },
  selectValue: { flex: 1, color: "#272128", fontSize: 15 },
  selectPlaceholder: { color: "#87808A" },
  selectDisabled: { opacity: 0.62, backgroundColor: "#F7F3F8" },
  selectPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  selectMenu: { marginTop: -5, marginBottom: 12, borderWidth: 1, borderColor: "#DDD2E2", borderRadius: 21, backgroundColor: "#FEFDFE", overflow: "hidden" },
  selectOption: { minHeight: 55, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: "#F0EAF2" },
  selectOptionActive: { backgroundColor: "#F1E2FD" },
  selectOptionText: { color: "#332C36", fontSize: 14.5, fontWeight: "700" },
  selectOptionTextActive: { color: "#7132AA" },
  selectOptionDetail: { color: "#837B86", fontSize: 10.5, marginTop: 2 },
  selectEmpty: { marginTop: -5, marginBottom: 12, borderRadius: 18, backgroundColor: "#F7F3F8", padding: 14 },
  selectEmptyText: { color: "#766E78", fontSize: 12 },
  optionCard: { padding: 16, marginBottom: 8, borderWidth: 1 },
  dateButton: { flexDirection: "row", alignItems: "center", padding: 16, borderWidth: 1.5, marginTop: 8 },
  textArea: { borderWidth: 1.5 },
  charCount: { flexDirection: "row", justifyContent: "flex-end", padding: 8, borderTopWidth: 1 },
  toggleBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  alertCard: { flexDirection: "row", alignItems: "center", padding: 14 },
  witnessRow: { flexDirection: "row", alignItems: "flex-start", padding: 8, borderWidth: 1, marginBottom: 8 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderWidth: 1.5, borderStyle: "dashed" },
  evidenceBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 24, borderWidth: 1.5, borderStyle: "dashed" },
  mediaHint: { flexDirection: "row", alignItems: "flex-start", padding: 12 },
  mediaErrorCard: { flexDirection: "row", alignItems: "flex-start", padding: 14, borderWidth: 1 },
  retryUploadButton: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  mediaProgress: { flexDirection: "row", alignItems: "center", padding: 12 },
  fileRow: { flexDirection: "row", alignItems: "center", padding: 12 },
  checkRow: { flexDirection: "row", alignItems: "center" },
  footer: { paddingHorizontal: 36, paddingTop: 11, backgroundColor: "rgba(254,253,254,0.96)", borderTopColor: "#EAE4EA", borderTopWidth: 1 },
  footerActions: { flexDirection: "row", gap: 10 },
  backAction: { height: 54, minWidth: 96, borderWidth: 1.25, borderColor: "#B7B1B9", borderRadius: 27, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  backActionText: { color: "#5E5861", fontSize: 15, fontWeight: "700" },
  nextAction: { flex: 1, height: 54, borderRadius: 27, backgroundColor: "#A95BEA", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, paddingHorizontal: 20 },
  nextActionSolo: { flex: 0, minWidth: 136, marginLeft: "auto" },
  nextActionText: { color: "#FFFFFF", fontSize: 15.5, fontWeight: "700" },
});
