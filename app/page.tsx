"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { PDFViewer } from "@/components/pdf-viewer";
import { PDFInput } from "@/components/pdf-input";
import { FilterControls } from "@/components/filter-controls";
import { PresetManager } from "@/components/preset-manager";
import { CommandPalette } from "@/components/command-palette";
import { GlobalDropOverlay } from "@/components/global-drop-overlay";
import { useGlobalDragDrop } from "@/hooks/use-global-drag-drop";
import { useSessionPersistence } from "@/hooks/use-session-persistence";
import { Settings2, PanelLeftClose, PanelLeft, Share2, Maximize, Minimize, ChevronLeft, ChevronRight } from "lucide-react";
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
const PRESETS_STORAGE_KEY = "dark-pdf-presets";

interface FilterSettings {
  darkMode: boolean;
  smartDarkMode: boolean;
  inversion: number;
  brightness: number;
  contrast: number;
  sepia: number;
}

interface Preset {
  id: string;
  name: string;
  inversion: number;
  brightness: number;
  contrast: number;
  sepia: number;
}

const defaultFilters: FilterSettings = {
  darkMode: true,
  smartDarkMode: false,
  inversion: 90,
  brightness: 90,
  contrast: 90,
  sepia: 10,
};

function HomeContent() {
  const [pdfSource, setPdfSource] = useState<string | ArrayBuffer | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(defaultFilters.darkMode);
  const [smartDarkMode, setSmartDarkMode] = useState(defaultFilters.smartDarkMode);
  const [inversion, setInversion] = useState(defaultFilters.inversion);
  const [brightness, setBrightness] = useState(defaultFilters.brightness);
  const [contrast, setContrast] = useState(defaultFilters.contrast);
  const [sepia, setSepia] = useState(defaultFilters.sepia);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [showZenControls, setShowZenControls] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [viewerScale, setViewerScale] = useState<number | null>(null);
  const [goToPageFn, setGoToPageFn] = useState<((page: number) => void) | null>(null);
  const [zoomInFn, setZoomInFn] = useState<(() => void) | null>(null);
  const [zoomOutFn, setZoomOutFn] = useState<(() => void) | null>(null);
  const [startOCRFn, setStartOCRFn] = useState<(() => void) | null>(null);

  const { saveSession, loadSession } = useSessionPersistence();

  useEffect(() => {
    const stored = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (stored) {
      try { setPresets(JSON.parse(stored)); } catch { /* Invalid JSON */ }
    }
  }, []);

  const handleFileDrop = useCallback((file: File) => {
    if (file.type !== "application/pdf") return;
    setPdfFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) setPdfSource(e.target.result as ArrayBuffer);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const { isDragging } = useGlobalDragDrop({ onFileDrop: handleFileDrop });

  useEffect(() => {
    const stored = localStorage.getItem(FILTER_STORAGE_KEY);
    if (stored) {
      try {
        const filters: FilterSettings = JSON.parse(stored);
        setDarkMode(filters.darkMode);
        setSmartDarkMode(filters.smartDarkMode ?? false);
        setInversion(filters.inversion);
        setBrightness(filters.brightness);
        setContrast(filters.contrast);
        setSepia(filters.sepia);
      } catch { /* Invalid JSON */ }
    }
    const params = new URLSearchParams(window.location.search);
    if (params.has("dm")) setDarkMode(params.get("dm") === "1");
    if (params.has("sdm")) setSmartDarkMode(params.get("sdm") === "1");
    if (params.has("inv")) setInversion(Math.min(100, Math.max(0, parseInt(params.get("inv") || "90", 10))));
    if (params.has("br")) setBrightness(Math.min(300, Math.max(0, parseInt(params.get("br") || "90", 10))));
    if (params.has("ct")) setContrast(Math.min(300, Math.max(0, parseInt(params.get("ct") || "90", 10))));
    if (params.has("sp")) setSepia(Math.min(100, Math.max(0, parseInt(params.get("sp") || "10", 10))));
    setFiltersLoaded(true);
  }, []);

  useEffect(() => {
    if (!filtersLoaded) return;
    const filters: FilterSettings = { darkMode, smartDarkMode, inversion, brightness, contrast, sepia };
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
  }, [darkMode, smartDarkMode, inversion, brightness, contrast, sepia, filtersLoaded]);

  useEffect(() => {
    if (!pdfSource || !filtersLoaded) return;
    const timeoutId = setTimeout(() => {
      saveSession(pdfSource, pdfFileName, {
        pageNum: currentPage,
        zoom: viewerScale || 1,
        filters: { darkMode, smartDarkMode, inversion, brightness, contrast, sepia },
      });
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [pdfSource, pdfFileName, currentPage, viewerScale, darkMode, smartDarkMode, inversion, brightness, contrast, sepia, filtersLoaded, saveSession]);

  useEffect(() => {
    if (!isZenMode) return;
    const handleEscape = (e: KeyboardEvent) => { if (e.key === "Escape") setIsZenMode(false); };
    const handleMouseMove = () => {
      setShowZenControls(true);
      const timeout = setTimeout(() => setShowZenControls(false), 2000);
      return () => clearTimeout(timeout);
    };
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isZenMode]);

  const handleLoadPDF = async (source: string | ArrayBuffer, fileName?: string) => {
    setPdfSource(source);
    setPdfFileName(fileName || null);
    const session = await loadSession(source);
    if (session) {
      setCurrentPage(session.pageNum);
      setViewerScale(session.zoom);
      if (session.filters) {
        setDarkMode(session.filters.darkMode);
        setSmartDarkMode(session.filters.smartDarkMode ?? false);
        setInversion(session.filters.inversion);
        setBrightness(session.filters.brightness);
        setContrast(session.filters.contrast);
        setSepia(session.filters.sepia);
      }
    }
  };

  const handleApplyPreset = (preset: { inversion: number; brightness: number; contrast: number; sepia: number }) => {
    setInversion(preset.inversion);
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setSepia(preset.sepia);
  };

  const handleApplyPresetById = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) handleApplyPreset(preset);
  };

  const resetFilters = () => {
    setInversion(90);
    setBrightness(90);
    setContrast(90);
    setSepia(10);
  };

  const shareConfig = async () => {
    const params = new URLSearchParams();
    params.set("dm", darkMode ? "1" : "0");
    params.set("sdm", smartDarkMode ? "1" : "0");
    params.set("inv", String(inversion));
    params.set("br", String(brightness));
    params.set("ct", String(contrast));
    params.set("sp", String(sepia));
    if (currentPage > 1) params.set("p", String(currentPage));
    const url = window.location.origin + window.location.pathname + "?" + params.toString();
    try { await navigator.clipboard.writeText(url); } catch (e) { console.error("Failed to copy URL:", e); }
  };

  const handlePageChange = useCallback((current: number, total: number) => {
    setCurrentPage(current);
    setTotalPages(total);
  }, []);

  const handleScaleChange = useCallback((scale: number) => {
    setViewerScale(scale);
  }, []);

  const handleViewerReady = useCallback((controls: {
    goToPage: (page: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    startOCR: () => void;
  }) => {
    setGoToPageFn(() => controls.goToPage);
    setZoomInFn(() => controls.zoomIn);
    setZoomOutFn(() => controls.zoomOut);
    setStartOCRFn(() => controls.startOCR);
  }, []);

  const filterControlsProps = {
    darkMode,
    setDarkMode,
    smartDarkMode,
    setSmartDarkMode,
    inversion,
    setInversion,
    brightness,
    setBrightness,
    contrast,
    setContrast,
    sepia,
    setSepia,
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <GlobalDropOverlay isDragging={isDragging} />
      
      <CommandPalette
        darkMode={darkMode}
        smartDarkMode={smartDarkMode}
        isZenMode={isZenMode}
        currentPage={currentPage}
        totalPages={totalPages}
        presets={presets}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onToggleSmartDarkMode={() => setSmartDarkMode(!smartDarkMode)}
        onToggleZenMode={() => setIsZenMode(!isZenMode)}
        onResetFilters={resetFilters}
        onApplyPreset={handleApplyPresetById}
        onGoToPage={(page) => goToPageFn?.(page)}
        onZoomIn={() => zoomInFn?.()}
        onZoomOut={() => zoomOutFn?.()}
        onShareConfig={shareConfig}
        onStartOCR={startOCRFn ? () => startOCRFn() : undefined}
      />

      {!isZenMode && (
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-semibold text-foreground">Dark PDF</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Comfortable reading in dark mode</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={shareConfig} title="Copy shareable link">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsZenMode(true)} title="Enter Zen Mode">
              <Maximize className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </Button>
          
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Settings2 className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 bg-card flex flex-col overflow-hidden">
                <SheetHeader>
                  <SheetTitle className="text-foreground">Settings</SheetTitle>
                  <SheetDescription className="text-muted-foreground">Configure your PDF viewing experience</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-8 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <PDFInput onLoadPDF={handleLoadPDF} />
                  <div className="border-t border-border pt-6">
                    <FilterControls {...filterControlsProps} />
                  </div>
                  <div className="border-t border-border pt-6">
                    <PresetManager inversion={inversion} brightness={brightness} contrast={contrast} sepia={sepia} onApplyPreset={handleApplyPreset} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && !isZenMode && (
          <aside className="hidden w-80 flex-shrink-0 overflow-y-auto border-r border-border bg-card p-6 lg:block scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="space-y-8">
              <PDFInput onLoadPDF={handleLoadPDF} />
              <div className="border-t border-border pt-6">
                <FilterControls {...filterControlsProps} />
              </div>
              <div className="border-t border-border pt-6">
                <PresetManager inversion={inversion} brightness={brightness} contrast={contrast} sepia={sepia} onApplyPreset={handleApplyPreset} />
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-hidden">
          <PDFViewer
            pdfSource={pdfSource}
            pdfFileName={pdfFileName}
            darkMode={darkMode}
            smartDarkMode={smartDarkMode}
            inversion={inversion}
            brightness={brightness}
            contrast={contrast}
            sepia={sepia}
            isZenMode={isZenMode}
            showZenControls={showZenControls}
            initialPage={currentPage}
            initialScale={viewerScale}
            onPageChange={handlePageChange}
            onScaleChange={handleScaleChange}
            onViewerReady={handleViewerReady}
          />
        </main>
      </div>

      {isZenMode && showZenControls && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2 rounded-full bg-card/95 px-4 py-2 shadow-lg backdrop-blur border border-border">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => goToPageFn?.(currentPage - 1)} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[60px] text-center text-sm text-foreground">{currentPage} / {totalPages}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => goToPageFn?.(currentPage + 1)} disabled={currentPage >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="mx-1 h-4 w-px bg-border" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsZenMode(false)} title="Exit Zen Mode">
              <Minimize className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
