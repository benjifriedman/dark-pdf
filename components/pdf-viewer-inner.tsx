"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
  Download,
  MoveHorizontal,
  MoveVertical,
} from "lucide-react";

const PDFJS_VERSION = "4.4.168";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

interface PDFViewerInnerProps {
  pdfSource: string | ArrayBuffer | null;
  pdfFileName: string | null;
  darkMode: boolean;
  inversion: number;
  brightness: number;
  contrast: number;
  sepia: number;
  onPageChange?: (current: number, total: number) => void;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export function PDFViewerInner({
  pdfSource,
  pdfFileName,
  darkMode,
  inversion,
  brightness,
  contrast,
  sepia,
}: PDFViewerInnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          goToPrevPage();
          break;
        case 'ArrowRight':
          goToNextPage();
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case 'r':
          if (!e.metaKey && !e.ctrlKey) {
            rotate();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  // Load PDF.js from CDN
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfjsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `${PDFJS_CDN}/pdf.min.mjs`;
    script.type = "module";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`;
      setPdfjsReady(true);
    };
    script.onerror = () => {
      setError("Failed to load PDF.js library");
    };
    document.head.appendChild(script);
  }, []);

  // Calculate fit-to-width scale when PDF loads
  const calculateFitScale = useCallback(async (pdf: any, mode: 'width' | 'height' = 'width') => {
    if (!containerRef.current) return 1.5;
    
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1, rotation: 0 });
    const containerWidth = containerRef.current.clientWidth - 32; // Account for padding
    const containerHeight = containerRef.current.clientHeight - 32;
    
    if (mode === 'height') {
      const fitScale = containerHeight / viewport.height;
      return Math.min(Math.max(fitScale, 0.5), 3);
    }
    
    const fitScale = containerWidth / viewport.width;
    return Math.min(Math.max(fitScale, 0.5), 3); // Clamp between 0.5 and 3
  }, []);

  const loadPDF = useCallback(async () => {
    if (!pdfSource || !pdfjsReady || !window.pdfjsLib) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if it's a proxy URL that might return an error
      if (typeof pdfSource === "string" && pdfSource.includes("/api/pdf-proxy")) {
        const response = await fetch(pdfSource);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch PDF (${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        const fitScale = await calculateFitScale(pdf);
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setScale(fitScale);
      } else if (typeof pdfSource === "string") {
        const loadingTask = window.pdfjsLib.getDocument(pdfSource);
        const pdf = await loadingTask.promise;
        const fitScale = await calculateFitScale(pdf);
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setScale(fitScale);
      } else {
        // Copy the ArrayBuffer to avoid detached buffer issues
        const data = new Uint8Array(pdfSource);
        const loadingTask = window.pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;
        const fitScale = await calculateFitScale(pdf);
        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
        setCurrentPage(1);
        setScale(fitScale);
      }
    } catch (err: any) {
      console.error("[v0] Error loading PDF:", err);
      const message = err?.message || "Failed to load PDF";
      if (message.includes("CORS") || message.includes("cross-origin")) {
        setError("Cannot load this PDF due to cross-origin restrictions. Try uploading the file directly.");
      } else if (message.includes("network") || message.includes("fetch")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [pdfSource, pdfjsReady]);

  useEffect(() => {
    loadPDF();
  }, [loadPDF]);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      const viewport = page.getViewport({ scale, rotation });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error("[v0] Error rendering page:", err);
    }
  }, [pdfDoc, currentPage, scale, rotation]);

  useEffect(() => {
    renderPage();
  }, [renderPage]);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min((prev || 1) + 0.2, 3));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max((prev || 1) - 0.2, 0.5));
  };

  const zoomToFit = async () => {
    if (!pdfDoc) return;
    const fitScale = await calculateFitScale(pdfDoc, 'width');
    setScale(fitScale);
  };

  const zoomToFitHeight = async () => {
    if (!pdfDoc) return;
    const fitScale = await calculateFitScale(pdfDoc, 'height');
    setScale(fitScale);
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const getFilterStyle = () => {
    if (!darkMode) return {};

    return {
      filter: `invert(${inversion}%) brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%)`,
    };
  };

  const exportPDF = async () => {
    if (!pdfDoc || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);

    try {
      const { jsPDF } = await import("jspdf");
      
      let pdf: any = null;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setExportProgress(Math.round((pageNum / totalPages) * 100));
        
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2, rotation }); // Higher scale for quality

        // Create offscreen canvas
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d")!;

        // Render the page
        await page.render({ canvasContext: context, viewport }).promise;

        // Apply filters if dark mode is enabled
        if (darkMode) {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const filtered = applyFilters(imageData, inversion, brightness, contrast, sepia);
          context.putImageData(filtered, 0, 0);
        }

        // Convert to mm for jsPDF (assuming 72 DPI base, scaled by 2)
        const pxToMm = 25.4 / (72 * 2);
        const pageWidthMm = viewport.width * pxToMm;
        const pageHeightMm = viewport.height * pxToMm;

        if (pageNum === 1) {
          // Create PDF with first page dimensions
          pdf = new jsPDF({
            orientation: pageWidthMm > pageHeightMm ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [pageWidthMm, pageHeightMm],
          });
        } else {
          // Add new page with this page's dimensions
          pdf.addPage([pageWidthMm, pageHeightMm], pageWidthMm > pageHeightMm ? 'landscape' : 'portrait');
        }

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, pageHeightMm);
      }

      // Generate export filename
      let exportName = "document";
      if (pdfFileName) {
        exportName = pdfFileName.replace(/\.pdf$/i, "");
      }
      pdf.save(`${exportName}--dark-mode.pdf`);
    } catch (err) {
      console.error("Export failed:", err);
      setError("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Apply CSS-like filters to ImageData
  const applyFilters = (
    imageData: ImageData,
    invert: number,
    bright: number,
    contr: number,
    sep: number
  ): ImageData => {
    const data = imageData.data;
    const invertRatio = invert / 100;
    const brightnessRatio = bright / 100;
    const contrastFactor = (contr / 100 - 0.5) * 2;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Invert
      r = r + (255 - 2 * r) * invertRatio;
      g = g + (255 - 2 * g) * invertRatio;
      b = b + (255 - 2 * b) * invertRatio;

      // Brightness
      r *= brightnessRatio;
      g *= brightnessRatio;
      b *= brightnessRatio;

      // Contrast
      r = ((r / 255 - 0.5) * (1 + contrastFactor) + 0.5) * 255;
      g = ((g / 255 - 0.5) * (1 + contrastFactor) + 0.5) * 255;
      b = ((b / 255 - 0.5) * (1 + contrastFactor) + 0.5) * 255;

      // Sepia
      const sepiaRatio = sep / 100;
      const sr = r * 0.393 + g * 0.769 + b * 0.189;
      const sg = r * 0.349 + g * 0.686 + b * 0.168;
      const sb = r * 0.272 + g * 0.534 + b * 0.131;
      r = r + (sr - r) * sepiaRatio;
      g = g + (sg - g) * sepiaRatio;
      b = b + (sb - b) * sepiaRatio;

      // Clamp values
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }

    return imageData;
  };

  if (!pdfjsReady) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pdfSource) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>Load a PDF to get started</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[80px] text-center text-sm text-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={zoomOut} title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="min-w-[60px] text-center text-sm text-foreground">
            {Math.round((scale || 1) * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={zoomIn} title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={zoomToFit} title="Fit to width">
            <MoveHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={zoomToFitHeight} title="Fit to height">
            <MoveVertical className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={rotate} title="Rotate">
            <RotateCw className="h-4 w-4" />
          </Button>
          <div className="mx-2 h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size={isExporting ? "sm" : "icon"}
            onClick={exportPDF}
            disabled={isExporting}
            title="Export with filters"
            className={isExporting ? "gap-2" : ""}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">{exportProgress}%</span>
              </>
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/50 p-4">
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            style={getFilterStyle()}
            className="max-w-full rounded-sm shadow-lg"
          />
        </div>
      </div>

      {/* Bottom Page Navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 border-t border-border bg-card px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
