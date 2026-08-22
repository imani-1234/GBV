import { useState, useEffect } from "react";
import { Platform } from "react-native";

export type Breakpoint = "phone" | "tablet" | "web-wide";

const PHONE_MAX = 480;
const TABLET_MAX = 1024;

function getBreakpoint(width: number): Breakpoint {
  if (width <= PHONE_MAX) return "phone";
  if (width <= TABLET_MAX) return "tablet";
  return "web-wide";
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>("phone");

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      setBp("phone");
      return;
    }
    const handler = () => setBp(getBreakpoint(window.innerWidth));
    handler();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return bp;
}

export function isWide(bp: Breakpoint): boolean {
  return bp === "tablet" || bp === "web-wide";
}
