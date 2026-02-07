"use client";

import { Upload } from "lucide-react";

interface GlobalDropOverlayProps {
  isDragging: boolean;
}

export function GlobalDropOverlay({ isDragging }: GlobalDropOverlayProps) {
  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-primary bg-card p-12 shadow-2xl">
        <div className="rounded-full bg-primary/10 p-6">
          <Upload className="h-12 w-12 text-primary" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-foreground">Drop your PDF here</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Release to open the document
          </p>
        </div>
      </div>
    </div>
  );
}
