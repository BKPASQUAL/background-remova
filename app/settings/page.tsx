"use client";

import { useSettings } from "../../hooks/useSettings";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { CornerPosition } from "../../utils/processImage";

export default function SettingsPage() {
  const { settings, updateSettings, isLoaded } = useSettings();

  if (!isLoaded)
    return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <main className="min-h-screen flex flex-col items-center bg-slate-50 p-4 md:p-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Default Configurations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Price Settings */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-slate-500 uppercase tracking-wider">
                Price Tag Defaults
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Default Price Text
                  </label>
                  <Input
                    value={settings.priceText}
                    onChange={(e) =>
                      updateSettings({ priceText: e.target.value })
                    }
                    placeholder="$0.00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Position
                  </label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={settings.pricePosition}
                    onChange={(e) =>
                      updateSettings({
                        pricePosition: e.target.value as CornerPosition,
                      })
                    }
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Logo Settings */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-slate-500 uppercase tracking-wider">
                Logo Defaults
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Position
                  </label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={settings.logoPosition}
                    onChange={(e) =>
                      updateSettings({
                        logoPosition: e.target.value as CornerPosition,
                      })
                    }
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-slate-400 italic">
                    Note: You will still need to upload the logo file on the
                    main page for each session.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link href="/">
                <Button className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Save & Return to Editor
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
