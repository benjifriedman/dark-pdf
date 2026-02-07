"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Moon,
  Sun,
  Sparkles,
  Palette,
  Maximize,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  ZoomOut,
  ScanText,
} from "lucide-react";

interface CommandPaletteProps {
  darkMode: boolean;
  smartDarkMode: boolean;
  isZenMode: boolean;
  currentPage: number;
  totalPages: number;
  presets: Array<{ id: string; name: string }>;
  onToggleDarkMode: () => void;
  onToggleSmartDarkMode: () => void;
  onToggleZenMode: () => void;
  onResetFilters: () => void;
  onApplyPreset: (presetId: string) => void;
  onGoToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onStartOCR?: () => void;
}

export function CommandPalette({
  darkMode,
  smartDarkMode,
  isZenMode,
  currentPage,
  totalPages,
  presets,
  onToggleDarkMode,
  onToggleSmartDarkMode,
  onToggleZenMode,
  onResetFilters,
  onApplyPreset,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onStartOCR,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [pageInput, setPageInput] = useState("");

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback((callback: () => void) => {
    callback();
    setOpen(false);
  }, []);

  const handleGoToPage = useCallback(() => {
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onGoToPage(page);
      setOpen(false);
      setPageInput("");
    }
  }, [pageInput, totalPages, onGoToPage]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command or search..." 
        value={pageInput}
        onValueChange={setPageInput}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="View">
          <CommandItem onSelect={() => handleSelect(onToggleDarkMode)}>
            {darkMode ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            <span>{darkMode ? "Disable" : "Enable"} Dark Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(onToggleSmartDarkMode)}>
            <Sparkles className="mr-2 h-4 w-4" />
            <span>{smartDarkMode ? "Disable" : "Enable"} Smart Dark Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(onToggleZenMode)}>
            <Maximize className="mr-2 h-4 w-4" />
            <span>{isZenMode ? "Exit" : "Enter"} Zen Mode</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(onResetFilters)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            <span>Reset Filters</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          {totalPages > 0 && (
            <>
              <CommandItem 
                onSelect={handleGoToPage}
                disabled={!pageInput || isNaN(parseInt(pageInput, 10))}
              >
                <ChevronRight className="mr-2 h-4 w-4" />
                <span>
                  {pageInput && !isNaN(parseInt(pageInput, 10)) 
                    ? `Go to page ${pageInput}` 
                    : `Go to page... (1-${totalPages})`}
                </span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => onGoToPage(1))}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                <span>Go to first page</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect(() => onGoToPage(totalPages))}>
                <ChevronRight className="mr-2 h-4 w-4" />
                <span>Go to last page</span>
              </CommandItem>
            </>
          )}
          <CommandItem onSelect={() => handleSelect(onZoomIn)}>
            <ZoomIn className="mr-2 h-4 w-4" />
            <span>Zoom In</span>
          </CommandItem>
          <CommandItem onSelect={() => handleSelect(onZoomOut)}>
            <ZoomOut className="mr-2 h-4 w-4" />
            <span>Zoom Out</span>
          </CommandItem>
        </CommandGroup>

        {presets.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Presets">
              {presets.map((preset) => (
                <CommandItem
                  key={preset.id}
                  onSelect={() => handleSelect(() => onApplyPreset(preset.id))}
                >
                  <Palette className="mr-2 h-4 w-4" />
                  <span>{preset.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Tools">
          {onStartOCR && (
            <CommandItem onSelect={() => handleSelect(onStartOCR)}>
              <ScanText className="mr-2 h-4 w-4" />
              <span>Run OCR on Current Page</span>
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
