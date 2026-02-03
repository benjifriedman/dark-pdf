"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Trash2, Check, X, Pencil } from "lucide-react";

interface Preset {
  id: string;
  name: string;
  inversion: number;
  brightness: number;
  contrast: number;
  sepia: number;
}

interface PresetManagerProps {
  inversion: number;
  brightness: number;
  contrast: number;
  sepia: number;
  onApplyPreset: (preset: Omit<Preset, "id" | "name">) => void;
}

const STORAGE_KEY = "dark-pdf-presets";

export function PresetManager({
  inversion,
  brightness,
  contrast,
  sepia,
  onApplyPreset,
}: PresetManagerProps) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [newPresetName, setNewPresetName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Load presets from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setPresets(JSON.parse(stored));
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save presets to localStorage
  const savePresets = (newPresets: Preset[]) => {
    setPresets(newPresets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPresets));
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset: Preset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      inversion,
      brightness,
      contrast,
      sepia,
    };

    savePresets([...presets, newPreset]);
    setNewPresetName("");
  };

  const handleDeletePreset = (id: string) => {
    savePresets(presets.filter((p) => p.id !== id));
  };

  const handleStartEdit = (preset: Preset) => {
    setEditingId(preset.id);
    setEditingName(preset.name);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return;

    savePresets(
      presets.map((p) =>
        p.id === id ? { ...p, name: editingName.trim() } : p
      )
    );
    setEditingId(null);
    setEditingName("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-foreground">Presets</Label>

      {/* Save new preset */}
      <div className="flex gap-2">
        <Input
          placeholder="Preset name"
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSavePreset()}
          className="flex-1 bg-input border-border text-foreground placeholder:text-muted-foreground"
        />
        <Button
          size="icon"
          onClick={handleSavePreset}
          disabled={!newPresetName.trim()}
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>

      {/* Preset list */}
      {presets.length > 0 && (
        <div className="space-y-2">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-2"
            >
              {editingId === preset.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(preset.id);
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    className="flex-1 h-7 text-sm bg-input border-border"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleSaveEdit(preset.id)}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onApplyPreset(preset)}
                    className="flex-1 text-left text-sm text-foreground hover:text-primary truncate"
                  >
                    {preset.name}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleStartEdit(preset)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleDeletePreset(preset.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {presets.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No presets saved yet. Adjust the filters and save your configuration.
        </p>
      )}
    </div>
  );
}
