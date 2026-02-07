"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OCROverlayProps {
  isProcessing: boolean;
  progress: number;
  text: string | null;
  onClose: () => void;
  canvasWidth: number;
  canvasHeight: number;
}

export function OCROverlay({
  isProcessing,
  progress,
  text,
  onClose,
  canvasWidth,
  canvasHeight,
}: OCROverlayProps) {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  if (!isProcessing && !text) return null;

  return (
    <div 
      className="absolute inset-0 z-10"
      style={{ width: canvasWidth, height: canvasHeight }}
    >
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-card p-6 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium text-foreground">Running OCR...</p>
              <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
            </div>
            <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {text && !isProcessing && (
        <div className="absolute inset-0 overflow-auto bg-background/95">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-2">
            <span className="text-sm font-medium text-foreground">OCR Result</span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="gap-1"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div 
            ref={textRef}
            className="whitespace-pre-wrap p-4 text-sm text-foreground selection:bg-primary/30"
          >
            {text}
          </div>
        </div>
      )}
    </div>
  );
}
