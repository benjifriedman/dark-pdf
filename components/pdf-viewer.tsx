"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const PDFViewerInner = dynamic(
  () => import("./pdf-viewer-inner").then((mod) => mod.PDFViewerInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface PDFViewerProps {
  pdfSource: string | ArrayBuffer | null;
  pdfFileName: string | null;
  darkMode: boolean;
  inversion: number;
  brightness: number;
  contrast: number;
  sepia: number;
}

export function PDFViewer(props: PDFViewerProps) {
  return <PDFViewerInner {...props} />;
}
