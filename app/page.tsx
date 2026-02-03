"use client";

import { useState, useEffect } from "react";
import { PDFViewer } from "@/components/pdf-viewer";
import { PDFInput } from "@/components/pdf-input";
import { FilterControls } from "@/components/filter-controls";
import { PresetManager } from "@/components/preset-manager";
import { FileText, Moon, Settings2, PanelLeftClose, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const FILTER_STORAGE_KEY = "dark-pdf-filters";

interface FilterSettings {
  darkMode: boolean;
  inversion: number;
  brightness: number;
  contrast: number;
  sepia: number;
}

const defaultFilters: FilterSettings = {
  darkMode: true,
  inversion: 90,
  brightness: 90,
  contrast: 90,
  sepia: 10,
};

export default function Home() {
  const [pdfSource, setPdfSource] = useState<string | ArrayBuffer | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(defaultFilters.darkMode);
  const [inversion, setInversion] = useState(defaultFilters.inversion);
  const [brightness, setBrightness] = useState(defaultFilters.brightness);
  const [contrast, setContrast] = useState(defaultFilters.contrast);
  const [sepia, setSepia] = useState(defaultFilters.sepia);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Load saved filter settings on mount
  useEffect(() => {
    const stored = localStorage.getItem(FILTER_STORAGE_KEY);
    if (stored) {
      try {
        const filters: FilterSettings = JSON.parse(stored);
        setDarkMode(filters.darkMode);
        setInversion(filters.inversion);
        setBrightness(filters.brightness);
        setContrast(filters.contrast);
        setSepia(filters.sepia);
      } catch {
        // Invalid JSON, use defaults
      }
    }
    setFiltersLoaded(true);
  }, []);

  // Save filter settings when they change
  useEffect(() => {
    if (!filtersLoaded) return;
    
    const filters: FilterSettings = {
      darkMode,
      inversion,
      brightness,
      contrast,
      sepia,
    };
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  }, [darkMode, inversion, brightness, contrast, sepia, filtersLoaded]);

  const handleLoadPDF = (source: string | ArrayBuffer, fileName?: string) => {
    setPdfSource(source);
    setPdfFileName(fileName || null);
  };

  const handleApplyPreset = (preset: {
    inversion: number;
    brightness: number;
    contrast: number;
    sepia: number;
  }) => {
    setInversion(preset.inversion);
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setSepia(preset.sepia);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Dark PDF</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Comfortable reading in dark mode
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground sm:flex">
            <Moon className="h-3 w-3" />
            {darkMode ? "Dark Mode On" : "Dark Mode Off"}
          </div>

          {/* Desktop Sidebar Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </Button>

          {/* Mobile Settings */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Settings2 className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-card overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-foreground">Settings</SheetTitle>
                <SheetDescription className="text-muted-foreground">
                  Configure your PDF viewing experience
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-8">
                <PDFInput onLoadPDF={handleLoadPDF} />
                <div className="border-t border-border pt-6">
                  <FilterControls
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                    inversion={inversion}
                    setInversion={setInversion}
                    brightness={brightness}
                    setBrightness={setBrightness}
                    contrast={contrast}
                    setContrast={setContrast}
                    sepia={sepia}
                    setSepia={setSepia}
                  />
                </div>
                <div className="border-t border-border pt-6">
                  <PresetManager
                    inversion={inversion}
                    brightness={brightness}
                    contrast={contrast}
                    sepia={sepia}
                    onApplyPreset={handleApplyPreset}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop */}
        {sidebarOpen && (
          <aside className="hidden w-80 flex-shrink-0 overflow-y-auto border-r border-border bg-card p-4 lg:block">
            <div className="space-y-8">
              <PDFInput onLoadPDF={handleLoadPDF} />
              <div className="border-t border-border pt-6">
                <FilterControls
                  darkMode={darkMode}
                  setDarkMode={setDarkMode}
                  inversion={inversion}
                  setInversion={setInversion}
                  brightness={brightness}
                  setBrightness={setBrightness}
                  contrast={contrast}
                  setContrast={setContrast}
                  sepia={sepia}
                  setSepia={setSepia}
                />
              </div>
              <div className="border-t border-border pt-6">
                <PresetManager
                  inversion={inversion}
                  brightness={brightness}
                  contrast={contrast}
                  sepia={sepia}
                  onApplyPreset={handleApplyPreset}
                />
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <PDFViewer
            pdfSource={pdfSource}
            pdfFileName={pdfFileName}
            darkMode={darkMode}
            inversion={inversion}
            brightness={brightness}
            contrast={contrast}
            sepia={sepia}
          />
        </main>
      </div>
    </div>
  );
}
