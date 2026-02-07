"use client";

import { useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

interface FilterSettings {
  darkMode: boolean;
  smartDarkMode: boolean;
  inversion: number;
  brightness: number;
  contrast: number;
  sepia: number;
  page?: number;
  zoom?: number;
}

const PARAM_KEYS = {
  darkMode: "dm",
  smartDarkMode: "sdm",
  inversion: "inv",
  brightness: "br",
  contrast: "ct",
  sepia: "sp",
  page: "p",
  zoom: "z",
} as const;

// Validate and sanitize numeric values
function sanitizeNumber(value: string | null, min: number, max: number, defaultVal: number): number {
  if (!value) return defaultVal;
  const num = parseFloat(value);
  if (isNaN(num)) return defaultVal;
  return Math.max(min, Math.min(max, num));
}

// Validate boolean values
function sanitizeBoolean(value: string | null, defaultVal: boolean): boolean {
  if (value === null) return defaultVal;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return defaultVal;
}

export function useUrlParams(
  filters: FilterSettings,
  setFilters: (filters: Partial<FilterSettings>) => void,
  defaults: FilterSettings
) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse URL params on mount
  useEffect(() => {
    const hasParams = Array.from(searchParams.keys()).some(key => 
      Object.values(PARAM_KEYS).includes(key as any)
    );
    
    if (!hasParams) return;

    const parsed: Partial<FilterSettings> = {};
    
    const dm = searchParams.get(PARAM_KEYS.darkMode);
    if (dm !== null) parsed.darkMode = sanitizeBoolean(dm, defaults.darkMode);
    
    const sdm = searchParams.get(PARAM_KEYS.smartDarkMode);
    if (sdm !== null) parsed.smartDarkMode = sanitizeBoolean(sdm, defaults.smartDarkMode);
    
    const inv = searchParams.get(PARAM_KEYS.inversion);
    if (inv !== null) parsed.inversion = sanitizeNumber(inv, 0, 100, defaults.inversion);
    
    const br = searchParams.get(PARAM_KEYS.brightness);
    if (br !== null) parsed.brightness = sanitizeNumber(br, 0, 300, defaults.brightness);
    
    const ct = searchParams.get(PARAM_KEYS.contrast);
    if (ct !== null) parsed.contrast = sanitizeNumber(ct, 0, 300, defaults.contrast);
    
    const sp = searchParams.get(PARAM_KEYS.sepia);
    if (sp !== null) parsed.sepia = sanitizeNumber(sp, 0, 100, defaults.sepia);
    
    const p = searchParams.get(PARAM_KEYS.page);
    if (p !== null) parsed.page = sanitizeNumber(p, 1, 10000, 1);
    
    const z = searchParams.get(PARAM_KEYS.zoom);
    if (z !== null) parsed.zoom = sanitizeNumber(z, 0.5, 3, 1);

    if (Object.keys(parsed).length > 0) {
      setFilters(parsed);
    }
  }, []);

  // Update URL when filters change
  const updateUrl = useCallback((newFilters: Partial<FilterSettings>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newFilters.darkMode !== undefined) {
      params.set(PARAM_KEYS.darkMode, newFilters.darkMode ? "1" : "0");
    }
    if (newFilters.smartDarkMode !== undefined) {
      params.set(PARAM_KEYS.smartDarkMode, newFilters.smartDarkMode ? "1" : "0");
    }
    if (newFilters.inversion !== undefined) {
      params.set(PARAM_KEYS.inversion, String(newFilters.inversion));
    }
    if (newFilters.brightness !== undefined) {
      params.set(PARAM_KEYS.brightness, String(newFilters.brightness));
    }
    if (newFilters.contrast !== undefined) {
      params.set(PARAM_KEYS.contrast, String(newFilters.contrast));
    }
    if (newFilters.sepia !== undefined) {
      params.set(PARAM_KEYS.sepia, String(newFilters.sepia));
    }
    if (newFilters.page !== undefined) {
      params.set(PARAM_KEYS.page, String(newFilters.page));
    }
    if (newFilters.zoom !== undefined) {
      params.set(PARAM_KEYS.zoom, String(newFilters.zoom.toFixed(2)));
    }

    const newUrl = `${pathname}?${params.toString()}`;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  // Generate shareable URL
  const getShareableUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set(PARAM_KEYS.darkMode, filters.darkMode ? "1" : "0");
    params.set(PARAM_KEYS.smartDarkMode, filters.smartDarkMode ? "1" : "0");
    params.set(PARAM_KEYS.inversion, String(filters.inversion));
    params.set(PARAM_KEYS.brightness, String(filters.brightness));
    params.set(PARAM_KEYS.contrast, String(filters.contrast));
    params.set(PARAM_KEYS.sepia, String(filters.sepia));
    if (filters.page) params.set(PARAM_KEYS.page, String(filters.page));
    if (filters.zoom) params.set(PARAM_KEYS.zoom, String(filters.zoom.toFixed(2)));
    
    return `${window.location.origin}${pathname}?${params.toString()}`;
  }, [filters, pathname]);

  return { updateUrl, getShareableUrl };
}
