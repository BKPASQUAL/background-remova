import { useState, useEffect } from "react";
import { CornerPosition } from "@/utils/processImage";

export interface AppSettings {
  priceText: string;
  pricePosition: CornerPosition;
  logoPosition: CornerPosition;
}

const DEFAULT_SETTINGS: AppSettings = {
  priceText: "",
  pricePosition: "bottom-right",
  logoPosition: "top-right",
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("social-post-settings");
    if (stored) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("social-post-settings", JSON.stringify(updated));
      return updated;
    });
  };

  return { settings, updateSettings, isLoaded };
}
