"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles } from "lucide-react";

interface FilterControlsProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  smartDarkMode: boolean;
  setSmartDarkMode: (value: boolean) => void;
  inversion: number;
  setInversion: (value: number) => void;
  brightness: number;
  setBrightness: (value: number) => void;
  contrast: number;
  setContrast: (value: number) => void;
  sepia: number;
  setSepia: (value: number) => void;
}

export function FilterControls({
  darkMode,
  setDarkMode,
  smartDarkMode,
  setSmartDarkMode,
  inversion,
  setInversion,
  brightness,
  setBrightness,
  contrast,
  setContrast,
  sepia,
  setSepia,
}: FilterControlsProps) {
  const resetFilters = () => {
    setInversion(90);
    setBrightness(90);
    setContrast(90);
    setSepia(10);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Dark Mode Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="dark-mode" className="text-sm text-foreground">
          Enable Dark Mode
        </Label>
        <Switch
          id="dark-mode"
          checked={darkMode}
          onCheckedChange={setDarkMode}
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="smart-dark-mode" className="text-sm text-foreground">
            Color Preserve Mode
          </Label>
          <Sparkles className="h-3 w-3 text-primary" />
        </div>
        <Switch
          id="smart-dark-mode"
          checked={smartDarkMode}
          onCheckedChange={setSmartDarkMode}
          disabled={!darkMode}
        />
      </div>

      <div className="space-y-4 opacity-100 transition-opacity" style={{ opacity: darkMode ? 1 : 0.5 }}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Inversion</Label>
            <span className="text-xs text-muted-foreground">{inversion}%</span>
          </div>
          <Slider
            value={[inversion]}
            onValueChange={(v) => setInversion(v[0])}
            min={0}
            max={100}
            step={1}
            disabled={!darkMode}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Brightness</Label>
            <span className="text-xs text-muted-foreground">{brightness}%</span>
          </div>
          <Slider
            value={[brightness]}
            onValueChange={(v) => setBrightness(v[0])}
            min={0}
            max={300}
            step={1}
            disabled={!darkMode}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Contrast</Label>
            <span className="text-xs text-muted-foreground">{contrast}%</span>
          </div>
          <Slider
            value={[contrast]}
            onValueChange={(v) => setContrast(v[0])}
            min={0}
            max={300}
            step={1}
            disabled={!darkMode}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">Sepia</Label>
            <span className="text-xs text-muted-foreground">{sepia}%</span>
          </div>
          <Slider
            value={[sepia]}
            onValueChange={(v) => setSepia(v[0])}
            min={0}
            max={100}
            step={1}
            disabled={!darkMode}
          />
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          Tip: Use <kbd className="rounded bg-muted px-1 py-0.5 text-[10px]">⌘K</kbd> to open the command palette for quick access to all features.
        </p>
      </div>
    </div>
  );
}
