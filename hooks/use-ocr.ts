"use client";

import { useState, useCallback, useRef } from "react";

interface UseOCRResult {
  isProcessing: boolean;
  progress: number;
  text: string | null;
  error: string | null;
  runOCR: (canvas: HTMLCanvasElement) => Promise<string | null>;
  clearResult: () => void;
}

export function useOCR(): UseOCRResult {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<any>(null);

  const runOCR = useCallback(async (canvas: HTMLCanvasElement): Promise<string | null> => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setText(null);

    try {
      // Dynamically import Tesseract.js
      const Tesseract = await import("tesseract.js");
      
      // Create worker
      const worker = await Tesseract.createWorker("eng", 1, {
        logger: (m: any) => {
          if (m.status === "recognizing text") {
            setProgress(m.progress * 100);
          }
        },
      });
      
      workerRef.current = worker;

      // Get image data from canvas
      const imageData = canvas.toDataURL("image/png");

      // Run OCR
      const { data } = await worker.recognize(imageData);
      
      // Terminate worker
      await worker.terminate();
      workerRef.current = null;

      setText(data.text);
      setIsProcessing(false);
      setProgress(100);
      
      return data.text;
    } catch (err: any) {
      console.error("OCR error:", err);
      setError(err.message || "OCR failed");
      setIsProcessing(false);
      return null;
    }
  }, []);

  const clearResult = useCallback(() => {
    setText(null);
    setError(null);
    setProgress(0);
  }, []);

  return {
    isProcessing,
    progress,
    text,
    error,
    runOCR,
    clearResult,
  };
}
