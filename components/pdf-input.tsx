"use client";

import React from "react"

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link, Upload, FileText, X, Image } from "lucide-react";

interface PDFInputProps {
  onLoadPDF: (source: string | ArrayBuffer, fileName?: string) => void;
  onLoadImage: (source: string | ArrayBuffer, fileName: string) => void;
}

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/bmp"];
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"];

export function PDFInput({ onLoadPDF, onLoadImage }: PDFInputProps) {
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = () => {
    if (!url.trim()) return;
    
    const trimmedUrl = url.trim();
    
    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(trimmedUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        alert("Please enter a valid HTTP or HTTPS URL");
        return;
      }
    } catch {
      alert("Please enter a valid URL");
      return;
    }
    
    const lowerUrl = trimmedUrl.toLowerCase();
    
    // Check if URL is an image based on extension
    const isImageUrl = IMAGE_EXTENSIONS.some(ext => lowerUrl.includes(ext));
    
    // Update browser URL with file parameter
    const params = new URLSearchParams(window.location.search);
    params.set("file", trimmedUrl);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newUrl);
    
    if (isImageUrl) {
      // Extract filename from URL
      const fileName = parsedUrl.pathname.split('/').pop() || 'image.png';
      onLoadImage(trimmedUrl, fileName);
    } else {
      // Assume PDF - route through proxy to avoid CORS issues
      const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(trimmedUrl)}`;
      onLoadPDF(proxyUrl);
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) return;

    const isPDF = file.type === "application/pdf";
    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);

    if (!isPDF && !isImage) {
      alert("Please select a PDF or image file (PNG, JPG, WEBP, GIF, BMP)");
      return;
    }

    // Clear file param from URL when uploading a local file
    const params = new URLSearchParams(window.location.search);
    if (params.has("file")) {
      params.delete("file");
      const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        if (isPDF) {
          onLoadPDF(e.target.result as ArrayBuffer, file.name);
        } else {
          onLoadImage(e.target.result as ArrayBuffer, file.name);
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const clearFile = () => {
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="space-y-2">
        <Label className="text-sm text-foreground">URL</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="url"
              placeholder="https://example.com/file.pdf or image"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
              className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button onClick={handleUrlSubmit} disabled={!url.trim()}>
            Load
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label className="text-sm text-foreground">Upload File</Label>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative rounded-lg border-2 border-dashed p-6 transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp,image/gif,image/bmp"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          
          {fileName ? (
            <div className="flex items-center gap-2 min-w-0">
              {fileName.toLowerCase().endsWith('.pdf') ? (
                <FileText className="h-5 w-5 flex-shrink-0 text-primary" />
              ) : (
                <Image className="h-5 w-5 flex-shrink-0 text-primary" />
              )}
              <span 
                className="text-sm text-foreground truncate flex-1"
                title={fileName}
              >
                {fileName}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">
                  Drop your file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports PDF and images (PNG, JPG, WEBP, GIF, BMP)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
