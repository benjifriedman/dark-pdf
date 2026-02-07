"use client";

import { useEffect, useCallback } from "react";

interface SessionData {
  pageNum: number;
  zoom: number;
  filters: {
    darkMode: boolean;
    smartDarkMode: boolean;
    inversion: number;
    brightness: number;
    contrast: number;
    sepia: number;
  };
}

const SESSION_STORAGE_KEY = "dark-pdf-sessions";

// Generate a simple hash from file content or name
async function generateFileHash(file: ArrayBuffer | string): Promise<string> {
  if (typeof file === "string") {
    // For URLs, use the URL itself as key
    return btoa(file).slice(0, 32);
  }
  
  // For ArrayBuffer, use first 1KB + size as fingerprint
  const data = new Uint8Array(file.slice(0, 1024));
  let hash = file.byteLength.toString(16);
  for (let i = 0; i < data.length; i += 64) {
    hash += data[i].toString(16).padStart(2, "0");
  }
  return hash.slice(0, 32);
}

export function useSessionPersistence() {
  // Get all sessions from storage
  const getSessions = useCallback((): Record<string, SessionData> => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }, []);

  // Save session for a file
  const saveSession = useCallback(async (
    fileSource: ArrayBuffer | string,
    fileName: string | null,
    data: SessionData
  ) => {
    try {
      const hash = await generateFileHash(fileSource);
      const sessions = getSessions();
      
      // Limit to 50 most recent sessions
      const entries = Object.entries(sessions);
      if (entries.length >= 50) {
        const sorted = entries.sort((a, b) => 
          (b[1] as any).timestamp - (a[1] as any).timestamp
        );
        const toKeep = sorted.slice(0, 49);
        const newSessions: Record<string, SessionData> = {};
        toKeep.forEach(([k, v]) => { newSessions[k] = v; });
        sessions[hash] = { ...data, fileName, timestamp: Date.now() } as any;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSessions));
      } else {
        sessions[hash] = { ...data, fileName, timestamp: Date.now() } as any;
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
      }
    } catch (e) {
      console.error("Failed to save session:", e);
    }
  }, [getSessions]);

  // Load session for a file
  const loadSession = useCallback(async (
    fileSource: ArrayBuffer | string
  ): Promise<SessionData | null> => {
    try {
      const hash = await generateFileHash(fileSource);
      const sessions = getSessions();
      return sessions[hash] || null;
    } catch {
      return null;
    }
  }, [getSessions]);

  // Clear all sessions
  const clearSessions = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  return { saveSession, loadSession, clearSessions };
}
