"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Loader2,
  MoveHorizontal,
  MoveVertical,
} from "lucide-react";

interface ImageViewerProps {
  imageSource: string | ArrayBuffer;
  fileName: string | null;
  darkMode: boolean;
  smartDarkMode: boolean;
  inversion: number;
  brightness: number;
  contrast: number;
  sepia: number;
  isZenMode?: boolean;
  stretchMode?: boolean;
  filmGrain?: boolean;
}

export function ImageViewer({
  imageSource,
  fileName,
  darkMode,
  smartDarkMode,
  inversion,
  brightness,
  contrast,
  sepia,
  isZenMode = false,
  stretchMode = false,
  filmGrain = false,
}: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [canPan, setCanPan] = useState(false);
  const [mimeType, setMimeType] = useState("image/png");

  // Convert ArrayBuffer to data URL
  useEffect(() => {
    if (typeof imageSource === "string") {
      setImageUrl(imageSource);
    } else {
      const blob = new Blob([imageSource]);
      const url = URL.createObjectURL(blob);
      setImageUrl(url);
      
      // Detect mime type from file name
      if (fileName) {
        const ext = fileName.split(".").pop()?.toLowerCase();
        if (ext === "jpg" || ext === "jpeg") setMimeType("image/jpeg");
        else if (ext === "png") setMimeType("image/png");
        else if (ext === "webp") setMimeType("image/webp");
        else if (ext === "gif") setMimeType("image/gif");
        else if (ext === "bmp") setMimeType("image/bmp");
      }
      
      return () => URL.revokeObjectURL(url);
    }
  }, [imageSource, fileName]);

  // Calculate fit scale
  const calculateFitScale = useCallback((mode: 'width' | 'height' = 'width') => {
    if (!containerRef.current || !imageSize.width) return 1;
    const containerWidth = containerRef.current.clientWidth - 32;
    const containerHeight = containerRef.current.clientHeight - 32;
    if (mode === 'height') return Math.min(Math.max(containerHeight / imageSize.height, 0.3), 9);
    return Math.min(Math.max(containerWidth / imageSize.width, 0.3), 9);
  }, [imageSize]);

  // Set initial scale when image loads
  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageSize({ width: imageRef.current.naturalWidth, height: imageRef.current.naturalHeight });
    }
  };

  useEffect(() => {
    if (imageSize.width && containerRef.current) {
      setScale(calculateFitScale('width'));
    }
  }, [imageSize, calculateFitScale]);

  // Check if content overflows container
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
  }, [imageSize, scale]);

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canPan || !containerRef.current) return;
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

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 9));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.3));
  const zoomToFit = () => setScale(calculateFitScale('width'));
  const zoomToFitHeight = () => setScale(calculateFitScale('height'));
  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  const getFilterStyle = (): React.CSSProperties => {
    if (!darkMode) return {};
    if (smartDarkMode) {
      return { filter: `invert(${inversion}%) hue-rotate(180deg) brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%)` };
    }
    return { filter: `invert(${inversion}%) brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%)` };
  };

  const exportImage = async () => {
    if (!imageUrl || isExporting) return;
    setIsExporting(true);
    
    try {
      // Create a canvas to apply filters
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Apply filters if dark mode is on
      if (darkMode) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        applyFilters(imageData, inversion, brightness, contrast, sepia, smartDarkMode);
        ctx.putImageData(imageData, 0, 0);
      }
      
      // Determine output format and extension
      let outputMime = mimeType;
      let ext = fileName?.split(".").pop()?.toLowerCase() || "png";
      
      // Convert to appropriate format
      const quality = outputMime === "image/jpeg" ? 0.95 : undefined;
      const dataUrl = canvas.toDataURL(outputMime, quality);
      
      // Download
      const link = document.createElement("a");
      const baseName = fileName ? fileName.replace(/\.[^.]+$/, "") : "image";
      link.download = `${baseName}--dark-mode.${ext}`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const applyFilters = (imageData: ImageData, invert: number, bright: number, contr: number, sep: number, smart: boolean) => {
    const data = imageData.data;
    const invertRatio = invert / 100;
    const brightnessRatio = bright / 100;
    const contrastFactor = (contr / 100 - 0.5) * 2;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];
      
      r = r + (255 - 2 * r) * invertRatio;
      g = g + (255 - 2 * g) * invertRatio;
      b = b + (255 - 2 * b) * invertRatio;

      if (smart) {
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
          
          h = (h + 0.5) % 1;
          
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

      r *= brightnessRatio;
      g *= brightnessRatio;
      b *= brightnessRatio;

      r = ((r / 255 - 0.5) * (1 + contrastFactor) + 0.5) * 255;
      g = ((g / 255 - 0.5) * (1 + contrastFactor) + 0.5) * 255;
      b = ((b / 255 - 0.5) * (1 + contrastFactor) + 0.5) * 255;

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
  };

  if (!imageUrl) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const toolbarHidden = isZenMode;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className={`flex items-center justify-between border-b border-border bg-card px-4 py-2 transition-all duration-300 ${toolbarHidden ? "opacity-0 pointer-events-none h-0 py-0 border-0 overflow-hidden" : "opacity-100"}`}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground truncate max-w-[200px]" title={fileName || "Image"}>
            {fileName || "Image"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={zoomOut} title="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
          <span className="min-w-[60px] text-center text-sm text-foreground">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={zoomIn} title="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={zoomToFit} title="Fit to width"><MoveHorizontal className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={zoomToFitHeight} title="Fit to height"><MoveVertical className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={rotate} title="Rotate"><RotateCw className="h-4 w-4" /></Button>
          <div className="mx-2 h-4 w-px bg-border" />
          <Button variant="ghost" size={isExporting ? "sm" : "icon"} onClick={exportImage} disabled={isExporting} title="Export with filters" className={isExporting ? "gap-2" : ""}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div 
        ref={containerRef} 
        className={`flex-1 overflow-auto bg-muted/50 p-4 ${canPan ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className={`relative ${stretchMode ? "flex justify-center" : "inline-flex justify-center min-w-full"} ${filmGrain ? "film-grain" : ""}`}>
          <img
            ref={imageRef}
            src={imageUrl}
            alt={fileName || "Image"}
            onLoad={handleImageLoad}
            style={{
              ...getFilterStyle(),
              width: imageSize.width ? imageSize.width * scale : 'auto',
              height: imageSize.height ? imageSize.height * scale : 'auto',
              transform: `rotate(${rotation}deg)`,
              ...(stretchMode ? {} : { maxWidth: 'none' }),
            }}
            className="rounded-sm shadow-lg"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
