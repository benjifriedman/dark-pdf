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
  const [fitMode, setFitMode] = useState<'width' | 'height' | null>('width');
  
  // Pinch-to-zoom state
  const [isPinching, setIsPinching] = useState(false);
  const initialPinchDistance = useRef<number | null>(null);
  const initialPinchScale = useRef<number | null>(null);

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
    if (mode === 'height') return Math.min(Math.max(containerHeight / imageSize.height, 0.01), 9);
    return Math.min(Math.max(containerWidth / imageSize.width, 0.01), 9);
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
      setFitMode('width');
    }
  }, [imageSize, calculateFitScale]);

  // Auto-resize when in fit mode and container dimensions change
  useEffect(() => {
    if (!fitMode || !imageSize.width || !containerRef.current) return;
    
    const container = containerRef.current;
    let resizeTimeout: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setScale(calculateFitScale(fitMode));
      }, 100);
    };
    
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    
    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [fitMode, imageSize, calculateFitScale]);

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

  // Touch handlers for mobile pinch-to-zoom and pan
  const handleTouchStart = (e: React.TouchEvent) => {
    // Pinch-to-zoom with two fingers
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      initialPinchDistance.current = distance;
      initialPinchScale.current = scale;
      setIsPinching(true);
      return;
    }
    
    // Single finger pan when zoomed
    if (e.touches.length === 1 && canPan && containerRef.current) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
        scrollLeft: containerRef.current.scrollLeft,
        scrollTop: containerRef.current.scrollTop,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Handle pinch-to-zoom
    if (isPinching && e.touches.length === 2 && initialPinchDistance.current && initialPinchScale.current) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const scaleChange = distance / initialPinchDistance.current;
      const newScale = Math.min(Math.max(initialPinchScale.current * scaleChange, 0.1), 9);
      setFitMode(null);
      setScale(newScale);
      return;
    }
    
    // Handle single-finger pan when zoomed
    if (isDragging && e.touches.length === 1 && containerRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      containerRef.current.scrollLeft = dragStart.scrollLeft - dx;
      containerRef.current.scrollTop = dragStart.scrollTop - dy;
    }
  };

  const handleTouchEnd = () => {
    if (isPinching) {
      setIsPinching(false);
      initialPinchDistance.current = null;
      initialPinchScale.current = null;
    }
    setIsDragging(false);
  };

  const zoomIn = () => { setFitMode(null); setScale((prev) => Math.min(prev + 0.2, 9)); };
  const zoomOut = () => { setFitMode(null); setScale((prev) => Math.max(prev - 0.2, 0.01)); };
  const zoomToFit = () => { setFitMode('width'); setScale(calculateFitScale('width')); };
  const zoomToFitHeight = () => { setFitMode('height'); setScale(calculateFitScale('height')); };
  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  const getFilterStyle = (): React.CSSProperties => {
    if (!darkMode) return {};
    if (smartDarkMode) {
      // Color preserve mode: invert + hue-rotate(180deg) preserves original hues
      // Then apply brightness/contrast/sepia adjustments
      return { filter: `invert(${inversion}%) hue-rotate(180deg) saturate(1.1) brightness(${brightness}%) contrast(${contrast}%) sepia(${sepia}%)` };
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
    const sepiaRatio = sep / 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i], g = data[i + 1], b = data[i + 2];
      
      // Invert
      r = r + (255 - 2 * r) * invertRatio;
      g = g + (255 - 2 * g) * invertRatio;
      b = b + (255 - 2 * b) * invertRatio;

      // For color preserve mode, apply hue rotation (180 degrees) to preserve hues
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
        
        // Slight saturation boost for color preserve mode
        const avg = (r + g + b) / 3;
        r = avg + (r - avg) * 1.1;
        g = avg + (g - avg) * 1.1;
        b = avg + (b - avg) * 1.1;
      }

      // Apply brightness, contrast, sepia (both modes)
      r *= brightnessRatio;
      g *= brightnessRatio;
      b *= brightnessRatio;

      r = ((r / 255 - 0.5) * (1 + contrastFactor) + 0.5) * 255;
      g = ((g / 255 - 0.5) * (1 + contrastFactor) + 0.5) * 255;
      b = ((b / 255 - 0.5) * (1 + contrastFactor) + 0.5) * 255;

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
      <div className={`flex items-center justify-between border-b border-border bg-card px-2 sm:px-4 py-2 transition-all duration-300 ${toolbarHidden ? "opacity-0 pointer-events-none h-0 py-0 border-0 overflow-hidden" : "opacity-100"}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[100px] sm:max-w-[200px]" title={fileName || "Image"}>
            {fileName || "Image"}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" onClick={zoomOut} title="Zoom out" className="h-8 w-8 sm:h-9 sm:w-9"><ZoomOut className="h-4 w-4" /></Button>
          <span className="min-w-[45px] sm:min-w-[60px] text-center text-xs sm:text-sm text-foreground">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="icon" onClick={zoomIn} title="Zoom in" className="h-8 w-8 sm:h-9 sm:w-9"><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={zoomToFit} title="Fit to width" className={`h-8 w-8 sm:h-9 sm:w-9 ${fitMode === 'width' ? "bg-accent" : ""}`}><MoveHorizontal className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={zoomToFitHeight} title="Fit to height" className={`h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex ${fitMode === 'height' ? "bg-accent" : ""}`}><MoveVertical className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={rotate} title="Rotate" className="h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"><RotateCw className="h-4 w-4" /></Button>
          <div className="mx-1 sm:mx-2 h-4 w-px bg-border hidden sm:block" />
          <Button variant="ghost" size={isExporting ? "sm" : "icon"} onClick={exportImage} disabled={isExporting} title="Export with filters" className={`h-8 w-8 sm:h-9 sm:w-9 ${isExporting ? "gap-2" : ""}`}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Image Container */}
      <div 
        ref={containerRef} 
        className={`flex-1 overflow-auto bg-muted/50 p-2 sm:p-4 ${canPan ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
        style={{ touchAction: canPan ? 'none' : 'pan-y' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`relative ${stretchMode ? "flex justify-center" : "inline-flex justify-center min-w-full"}`}>
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
