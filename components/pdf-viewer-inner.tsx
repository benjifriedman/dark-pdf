"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { OCROverlay } from "@/components/ocr-overlay";
import { useOCR } from "@/hooks/use-ocr";
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
  ScanText,
} from "lucide-react";

const PDFJS_VERSION = "4.4.168";
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

interface PDFViewerInnerProps {
  pdfSource: string | ArrayBuffer | null;
  pdfFileName: string | null;
  darkMode: boolean;
  smartDarkMode: boolean;
  inversion: number;
  brightness: number;
  contrast: number;
  sepia: number;
  isZenMode?: boolean;
  showZenControls?: boolean;
  initialPage?: number;
  initialScale?: number | null;
  onPageChange?: (current: number, total: number) => void;
  onScaleChange?: (scale: number) => void;
  onViewerReady?: (controls: {
    goToPage: (page: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    startOCR: () => void;
  }) => void;
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
  smartDarkMode,
  inversion,
  brightness,
  contrast,
  sepia,
  isZenMode = false,
  showZenControls = false,
  initialPage = 1,
  initialScale = null,
  onPageChange,
  onScaleChange,
  onViewerReady,
}: PDFViewerInnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState<number | null>(initialScale);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");
  const pageInputRef = useRef<HTMLInputElement>(null);
  const [linkAnnotations, setLinkAnnotations] = useState<Array<{
    rect: { x: number; y: number; width: number; height: number };
    dest: number | null; // page number for internal links
    url: string | null;  // URL for external links
  }>>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [canPan, setCanPan] = useState(false);

  const { isProcessing: isOCRProcessing, progress: ocrProgress, text: ocrText, runOCR, clearResult: clearOCR } = useOCR();

  // Expose controls to parent
  useEffect(() => {
    if (onViewerReady) {
      onViewerReady({
        goToPage: (page: number) => {
          if (page >= 1 && page <= totalPages) { clearOCR(); setCurrentPage(page); }
        },
        zoomIn: () => setScale((prev) => Math.min((prev || 1) + 0.2, 9)),
        zoomOut: () => setScale((prev) => Math.max((prev || 1) - 0.2, 0.3)),
        startOCR: () => {
          if (canvasRef.current) runOCR(canvasRef.current);
        },
      });
    }
  }, [onViewerReady, totalPages, runOCR, clearOCR]);

  // Notify parent of page changes
  useEffect(() => {
    if (onPageChange && totalPages > 0) {
      onPageChange(currentPage, totalPages);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Notify parent of scale changes
  useEffect(() => {
    if (onScaleChange && scale !== null) {
      onScaleChange(scale);
    }
  }, [scale, onScaleChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowLeft': goToPrevPage(); break;
        case 'ArrowRight': goToNextPage(); break;
        case '+': case '=': e.preventDefault(); zoomIn(); break;
        case '-': e.preventDefault(); zoomOut(); break;
        case 'r': if (!e.metaKey && !e.ctrlKey) rotate(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  // Load PDF.js from CDN
  useEffect(() => {
    if (window.pdfjsLib) { setPdfjsReady(true); return; }
    const script = document.createElement("script");
    script.src = `${PDFJS_CDN}/pdf.min.mjs`;
    script.type = "module";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.mjs`;
      setPdfjsReady(true);
    };
    script.onerror = () => setError("Failed to load PDF.js library");
    document.head.appendChild(script);
  }, []);

  const calculateFitScale = useCallback(async (pdf: any, mode: 'width' | 'height' = 'width') => {
    if (!containerRef.current) return 1.5;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1, rotation: 0 });
    const containerWidth = containerRef.current.clientWidth - 32;
    const containerHeight = containerRef.current.clientHeight - 32;
    if (mode === 'height') return Math.min(Math.max(containerHeight / viewport.height, 0.3), 9);
    return Math.min(Math.max(containerWidth / viewport.width, 0.3), 9);
  }, []);

  const loadPDF = useCallback(async () => {
    if (!pdfSource || !pdfjsReady || !window.pdfjsLib) return;
    setIsLoading(true);
    setError(null);
    try {
      let pdf;
      if (typeof pdfSource === "string" && pdfSource.includes("/api/pdf-proxy")) {
        const response = await fetch(pdfSource);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch PDF (${response.status})`);
        }
        const arrayBuffer = await response.arrayBuffer();
        pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      } else if (typeof pdfSource === "string") {
        pdf = await window.pdfjsLib.getDocument(pdfSource).promise;
      } else {
        // Copy the ArrayBuffer to avoid detached buffer issues
        const copy = pdfSource.slice(0);
        const data = new Uint8Array(copy);
        pdf = await window.pdfjsLib.getDocument({ data }).promise;
      }
      const fitScale = initialScale || await calculateFitScale(pdf);
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(Math.min(initialPage, pdf.numPages));
      setScale(fitScale);
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
  }, [pdfSource, pdfjsReady, initialPage, initialScale, calculateFitScale]);

  useEffect(() => { loadPDF(); }, [loadPDF]);

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !scale) return;
    if (renderTaskRef.current) {
      try { await renderTaskRef.current.cancel(); } catch { /* Ignore */ }
      renderTaskRef.current = null;
    }
    try {
      const page = await pdfDoc.getPage(currentPage);
      // Re-check canvas ref after async operation
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      const viewport = page.getViewport({ scale, rotation });
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      setCanvasSize({ width: viewport.width, height: viewport.height });
      renderTaskRef.current = page.render({ canvasContext: context, viewport });
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;
      
      // Extract link annotations
      const annotations = await page.getAnnotations();
      const links: typeof linkAnnotations = [];
      
      for (const annot of annotations) {
        if (annot.subtype === "Link" && annot.rect) {
          const [x1, y1, x2, y2] = annot.rect;
          // Transform coordinates using viewport
          const rect = viewport.convertToViewportRectangle([x1, y1, x2, y2]);
          const [vx1, vy1, vx2, vy2] = rect;
          
          // Normalize rect (PDF coords can be inverted)
          const x = Math.min(vx1, vx2);
          const y = Math.min(vy1, vy2);
          const width = Math.abs(vx2 - vx1);
          const height = Math.abs(vy2 - vy1);
          
          let dest: number | null = null;
          let url: string | null = null;
          
          if (annot.url) {
            url = annot.url;
          } else if (annot.dest) {
            // Internal link - resolve destination to page number
            try {
              if (typeof annot.dest === "string") {
                const destRef = await pdfDoc.getDestination(annot.dest);
                if (destRef && destRef[0]) {
                  const pageIndex = await pdfDoc.getPageIndex(destRef[0]);
                  dest = pageIndex + 1; // Convert to 1-based
                }
              } else if (Array.isArray(annot.dest) && annot.dest[0]) {
                const pageIndex = await pdfDoc.getPageIndex(annot.dest[0]);
                dest = pageIndex + 1;
              }
            } catch {
              // Failed to resolve destination
            }
          }
          
          if (dest || url) {
            links.push({ rect: { x, y, width, height }, dest, url });
          }
        }
      }
      
      setLinkAnnotations(links);
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') console.error("[v0] Error rendering page:", err);
    }
  }, [pdfDoc, currentPage, scale, rotation]);

  useEffect(() => { renderPage(); }, [renderPage]);

  const goToPrevPage = () => { if (currentPage > 1) { clearOCR(); setCurrentPage(currentPage - 1); } };
  const goToNextPage = () => { if (currentPage < totalPages) { clearOCR(); setCurrentPage(currentPage + 1); } };
  const zoomIn = () => setScale((prev) => Math.min((prev || 1) + 0.2, 9));
  const zoomOut = () => setScale((prev) => Math.max((prev || 1) - 0.2, 0.3));
  const zoomToFit = async () => { if (pdfDoc) setScale(await calculateFitScale(pdfDoc, 'width')); };
  const zoomToFitHeight = async () => { if (pdfDoc) setScale(await calculateFitScale(pdfDoc, 'height')); };
  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  const handlePageClick = () => {
    setPageInputValue(String(currentPage));
    setIsEditingPage(true);
    setTimeout(() => pageInputRef.current?.select(), 0);
  };

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      clearOCR();
      setCurrentPage(page);
    }
    setIsEditingPage(false);
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handlePageInputSubmit();
    } else if (e.key === "Escape") {
      setIsEditingPage(false);
    }
  };

  const handleLinkClick = (link: typeof linkAnnotations[0]) => {
    if (link.url) {
      // External link - open in new tab
      window.open(link.url, "_blank", "noopener,noreferrer");
    } else if (link.dest) {
      // Internal link - navigate to page
      clearOCR();
      setCurrentPage(link.dest);
    }
  };

  // Check if content overflows container (enables pan mode)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const checkOverflow = () => {
      const hasOverflow = container.scrollWidth > container.clientWidth || container.scrollHeight > container.clientHeight;
      setCanPan(hasOverflow);
    };
    checkOverflow();
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [canvasSize, scale]);

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canPan || !containerRef.current) return;
    // Don't start drag if clicking on a link or button
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      scrollLeft: containerRef.current.scrollLeft,
      scrollTop: containerRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    containerRef.current.scrollLeft = dragStart.scrollLeft - dx;
    containerRef.current.scrollTop = dragStart.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const getFilterStyle = (): React.CSSProperties => {
    if (!darkMode) return {};
    if (smartDarkMode) {
      // Smart dark mode: use hue-rotate(180deg) after invert to preserve colors better
      // This inverts luminosity but keeps hues roughly the same
      return { 
        filter: `invert(${inversion}%) hue-rotate(180deg) brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%)` 
      };
    }
    return { filter: `invert(${inversion}%) brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%)` };
  };

  const handleStartOCR = () => {
    if (canvasRef.current) runOCR(canvasRef.current);
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
        const viewport = page.getViewport({ scale: 2, rotation });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext("2d")!;
        await page.render({ canvasContext: context, viewport }).promise;
        if (darkMode) {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const filtered = applyFilters(imageData, inversion, brightness, contrast, sepia, smartDarkMode);
          context.putImageData(filtered, 0, 0);
        }
        const pxToMm = 25.4 / (72 * 2);
        const pageWidthMm = viewport.width * pxToMm;
        const pageHeightMm = viewport.height * pxToMm;
        if (pageNum === 1) {
          pdf = new jsPDF({ orientation: pageWidthMm > pageHeightMm ? 'landscape' : 'portrait', unit: 'mm', format: [pageWidthMm, pageHeightMm] });
        } else {
          pdf.addPage([pageWidthMm, pageHeightMm], pageWidthMm > pageHeightMm ? 'landscape' : 'portrait');
        }
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pageWidthMm, pageHeightMm);
      }
      let exportName = pdfFileName ? pdfFileName.replace(/\.pdf$/i, "") : "document";
      pdf.save(`${exportName}--dark-mode.pdf`);
    } catch (err) {
      console.error("Export failed:", err);
      setError("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const applyFilters = (imageData: ImageData, invert: number, bright: number, contr: number, sep: number, smart: boolean): ImageData => {
    const data = imageData.data;
    const invertRatio = invert / 100;
    const brightnessRatio = bright / 100;
    const contrastFactor = (contr / 100 - 0.5) * 2;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];
      
      // Invert
      r = r + (255 - 2 * r) * invertRatio;
      g = g + (255 - 2 * g) * invertRatio;
      b = b + (255 - 2 * b) * invertRatio;

      // For smart mode, apply hue rotation (180 degrees) to preserve colors
      if (smart) {
        // Convert to HSL, rotate hue by 180, convert back
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const l = (max + min) / 2;
        
        if (max !== min) {
          const d = max - min;
          const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          let h = 0;
          const rn = r / 255, gn = g / 255, bn = b / 255;
          if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
          else if (max === gn) h = ((bn - rn) / d + 2) / 6;
          else h = ((rn - gn) / d + 4) / 6;
          
          // Rotate hue by 180 degrees
          h = (h + 0.5) % 1;
          
          // Convert back to RGB
          const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
          };
          
          const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          const p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3) * 255;
          g = hue2rgb(p, q, h) * 255;
          b = hue2rgb(p, q, h - 1/3) * 255;
        }
      }

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

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
    
    return imageData;
  };

  if (!pdfjsReady) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!pdfSource) return <div className="flex h-full items-center justify-center text-muted-foreground"><p>Load a PDF to get started</p></div>;
  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (error) return <div className="flex h-full items-center justify-center text-destructive"><p>{error}</p></div>;

  const toolbarHidden = isZenMode;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className={`flex items-center justify-between border-b border-border bg-card px-4 py-2 transition-all duration-300 ${toolbarHidden ? "opacity-0 pointer-events-none h-0 py-0 border-0 overflow-hidden" : "opacity-100"}`}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goToPrevPage} disabled={currentPage <= 1}><ChevronLeft className="h-4 w-4" /></Button>
          {isEditingPage ? (
            <div className="flex items-center gap-1">
              <input
                ref={pageInputRef}
                type="text"
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value.replace(/\D/g, ""))}
                onBlur={handlePageInputSubmit}
                onKeyDown={handlePageInputKeyDown}
                className="w-12 rounded border border-border bg-input px-2 py-1 text-center text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <span className="text-sm text-muted-foreground">/ {totalPages}</span>
            </div>
          ) : (
            <button
              onClick={handlePageClick}
              className="min-w-[80px] rounded px-2 py-1 text-center text-sm text-foreground hover:bg-muted transition-colors"
              title="Click to jump to page"
            >
              {currentPage} / {totalPages}
            </button>
          )}
          <Button variant="ghost" size="icon" onClick={goToNextPage} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={zoomOut} title="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
          <span className="min-w-[60px] text-center text-sm text-foreground">{Math.round((scale || 1) * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={zoomIn} title="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={zoomToFit} title="Fit to width"><MoveHorizontal className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={zoomToFitHeight} title="Fit to height"><MoveVertical className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={rotate} title="Rotate"><RotateCw className="h-4 w-4" /></Button>
          <div className="mx-2 h-4 w-px bg-border" />
          <Button variant="ghost" size="icon" onClick={handleStartOCR} disabled={isOCRProcessing} title="Run OCR"><ScanText className="h-4 w-4" /></Button>
          <Button variant="ghost" size={isExporting ? "sm" : "icon"} onClick={exportPDF} disabled={isExporting} title="Export with filters" className={isExporting ? "gap-2" : ""}>
            {isExporting ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="text-xs">{exportProgress}%</span></> : <Download className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div 
        ref={containerRef} 
        className={`flex-1 overflow-auto bg-muted/50 p-4 ${canPan ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex justify-center">
          <div className="relative">
            <canvas ref={canvasRef} style={getFilterStyle()} className="rounded-sm shadow-lg" />
            {/* Link annotations overlay */}
            {linkAnnotations.length > 0 && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{ width: canvasSize.width, height: canvasSize.height }}
              >
                {linkAnnotations.map((link, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleLinkClick(link)}
                    className="absolute pointer-events-auto cursor-pointer hover:bg-primary/10 transition-colors rounded-sm"
                    style={{
                      left: link.rect.x,
                      top: link.rect.y,
                      width: link.rect.width,
                      height: link.rect.height,
                    }}
                    title={link.url || `Go to page ${link.dest}`}
                  />
                ))}
              </div>
            )}
            <OCROverlay isProcessing={isOCRProcessing} progress={ocrProgress} text={ocrText} onClose={clearOCR} canvasWidth={canvasSize.width} canvasHeight={canvasSize.height} />
          </div>
        </div>
      </div>

      {/* Bottom Page Navigation */}
      {totalPages > 1 && !toolbarHidden && (
        <div className="flex items-center justify-center gap-4 border-t border-border bg-card px-4 py-3">
          <Button variant="outline" size="sm" onClick={goToPrevPage} disabled={currentPage <= 1} className="gap-1"><ChevronLeft className="h-4 w-4" />Previous</Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={goToNextPage} disabled={currentPage >= totalPages} className="gap-1">Next<ChevronRight className="h-4 w-4" /></Button>
        </div>
      )}
    </div>
  );
}
