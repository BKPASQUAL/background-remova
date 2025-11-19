"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js"; 
import { removeBackground, preload, Config } from "@imgly/background-removal";
import { Button } from "@/components/ui/button"; 
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  Upload,
  Download,
  RefreshCw,
  Settings,
  Check,
  ImagePlus,
  Sliders,
  ZoomIn,
  RotateCw,
  Move
} from "lucide-react";
import { toast } from "sonner";

// --- SUPABASE SETUP ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// --- IMAGE PROCESSING CONFIG ---
const config: Config = {
  debug: true,
  model: "isnet_quint8",
  output: {
    format: "image/png",
    quality: 0.8,
  },
  progress: (key: string, current: number, total: number) => {
    console.log(
      `Downloading AI Model (${key}): ${Math.round((current / total) * 100)}%`
    );
  },
};

export async function preloadModel() {
  try {
    await preload(config);
  } catch (error) {
    console.error("Preloading failed:", error);
  }
}

export type CornerPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "custom";

export interface ProcessOptions {
  logoFile?: File | null;
  logoPosition?: CornerPosition;
  logoScale?: number;
  logoRotation?: number;
  logoX?: number;
  logoY?: number;

  priceText?: string;
  pricePosition?: CornerPosition;
  priceColor?: string;
  priceBgColor?: string;
  priceScale?: number;
  priceRotation?: number;
  priceX?: number;
  priceY?: number;
}

// --- IMAGE PROCESSING LOGIC ---
export async function processImage(
  imageFile: File,
  options: ProcessOptions = {}
): Promise<Blob> {
  try {
    const transparentBlob = await removeBackground(imageFile, config);
    const imageBitmap = await createImageBitmap(transparentBlob);

    const targetSize = 720;
    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Could not get canvas context");

    // Fill White Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, targetSize, targetSize);

    // Draw Main Product (Centered)
    const scale = Math.min(
      (targetSize * 0.9) / imageBitmap.width,
      (targetSize * 0.9) / imageBitmap.height
    );
    const newWidth = imageBitmap.width * scale;
    const newHeight = imageBitmap.height * scale;
    const x = (targetSize - newWidth) / 2;
    const y = (targetSize - newHeight) / 2;
    ctx.drawImage(imageBitmap, x, y, newWidth, newHeight);

    const padding = 40;
    const getCoords = (
      w: number,
      h: number,
      pos: CornerPosition,
      customX = 0,
      customY = 0
    ) => {
      if (pos === "custom") {
        return {
          x: (customX / 100) * targetSize - w / 2,
          y: (customY / 100) * targetSize - h / 2,
        };
      }
      switch (pos) {
        case "top-left": return { x: padding, y: padding };
        case "top-right": return { x: targetSize - w - padding, y: padding };
        case "bottom-left": return { x: padding, y: targetSize - h - padding };
        case "bottom-right": return { x: targetSize - w - padding, y: targetSize - h - padding };
        default: return { x: padding, y: padding };
      }
    };

    const drawTransform = (
      drawFn: () => void,
      cx: number,
      cy: number,
      angle: number,
      scale: number
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      drawFn();
      ctx.restore();
    };

    // Draw Logo
    if (options.logoFile) {
      const logoBitmap = await createImageBitmap(options.logoFile);
      const baseSize = 150;
      const ratio = Math.min(
        baseSize / logoBitmap.width,
        baseSize / logoBitmap.height
      );
      const logoW = logoBitmap.width * ratio;
      const logoH = logoBitmap.height * ratio;

      const pos = getCoords(
        logoW,
        logoH,
        options.logoPosition || "top-right",
        options.logoX,
        options.logoY
      );
      const cx = pos.x + logoW / 2;
      const cy = pos.y + logoH / 2;

      drawTransform(
        () => {
          ctx.drawImage(logoBitmap, pos.x, pos.y, logoW, logoH);
        },
        cx,
        cy,
        options.logoRotation || 0,
        options.logoScale || 1
      );
    }

    // Draw Price Tag
    if (options.priceText) {
      let displayText = options.priceText.trim();
      const numericValue = displayText.replace(/[^0-9.]/g, "");
      
      // Formatting Logic: Rs XXX/=
      if (numericValue && !displayText.toLowerCase().includes("rs")) {
        displayText = `Rs ${numericValue}/=`;
      } else if (
        displayText.toLowerCase().startsWith("rs") &&
        !displayText.endsWith("/=")
      ) {
        displayText += "/=";
      }

      const fontSize = 56;
      ctx.font = `bold ${fontSize}px sans-serif`;
      const metrics = ctx.measureText(displayText);

      const bgPadding = 16;
      const bgW = metrics.width + bgPadding * 2;
      const bgH = fontSize + bgPadding * 2;

      const pos = getCoords(
        bgW,
        bgH,
        options.pricePosition || "bottom-right",
        options.priceX,
        options.priceY
      );
      const cx = pos.x + bgW / 2;
      const cy = pos.y + bgH / 2;

      drawTransform(
        () => {
          // Shadow for pop
          ctx.shadowColor = "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 5;

          // Box Background
          ctx.fillStyle = options.priceBgColor || "#E11D48";
          ctx.beginPath();
          ctx.roundRect(pos.x, pos.y, bgW, bgH, 12);
          ctx.fill();

          // Text
          ctx.shadowColor = "transparent";
          ctx.fillStyle = options.priceColor || "#FFFFFF";
          ctx.textBaseline = "top";
          ctx.fillText(displayText, pos.x + bgPadding, pos.y + bgPadding + 4);
        },
        cx,
        cy,
        options.priceRotation || 0,
        options.priceScale || 1
      );
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas export failed"));
        },
        "image/jpeg",
        0.95
      );
    });
  } catch (error) {
    console.warn("Advanced processing failed...", error);
    return await removeBackground(imageFile);
  }
}

// --- SETTINGS HOOK LOGIC ---
interface AppSettings {
  priceText: string;
  pricePosition: CornerPosition;
  logoPosition: CornerPosition;
}

const DEFAULT_SETTINGS: AppSettings = {
  priceText: "",
  pricePosition: "bottom-right",
  logoPosition: "top-right",
};

function useLocalSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("social-post-settings");
      if (stored) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
        } catch (e) {
          console.error("Failed to parse settings", e);
        }
      }
      setIsLoaded(true);
    }
  }, []);

  return { settings, isLoaded };
}

// --- MAIN COMPONENT ---

export default function Home() {
  const { settings, isLoaded } = useLocalSettings();
  const [loading, setLoading] = useState(false);

  // Inputs
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Settings
  const [priceText, setPriceText] = useState<string>("");
  const [logoPos, setLogoPos] = useState<CornerPosition>("top-right");
  const [pricePos, setPricePos] = useState<CornerPosition>("bottom-right");
  const [priceColor, setPriceColor] = useState<string>("#FFFFFF");
  const [priceBgColor, setPriceBgColor] = useState<string>("#E11D48");

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [logoScale, setLogoScale] = useState(1);
  const [logoRotation, setLogoRotation] = useState(0);
  const [logoX, setLogoX] = useState(50);
  const [logoY, setLogoY] = useState(50);

  const [priceScale, setPriceScale] = useState(1);
  const [priceRotation, setPriceRotation] = useState(0);
  const [priceX, setPriceX] = useState(50);
  const [priceY, setPriceY] = useState(50);

  // Previews
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    preloadModel();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      setPriceText(settings.priceText || "");
      setLogoPos(settings.logoPosition || "top-right");
      setPricePos(settings.pricePosition || "bottom-right");
    }
  }, [isLoaded, settings]);

  const handleMainImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setOriginalFile(file);
      setOriginalPreview(URL.createObjectURL(file));
      setProcessedPreview(null);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setLogoFile(e.target.files[0]);
      toast.success("Logo uploaded!");
    }
  };

  const handleProcess = async () => {
    if (!originalFile) {
      toast.error("Please upload a product image first.");
      return;
    }

    setLoading(true);
    try {
      const finalBlob = await processImage(originalFile, {
        logoFile,
        logoPosition: showAdvanced ? "custom" : logoPos,
        logoScale,
        logoRotation,
        logoX,
        logoY,

        priceText,
        pricePosition: showAdvanced ? "custom" : pricePos,
        priceColor,
        priceBgColor,
        priceScale,
        priceRotation,
        priceX,
        priceY,
      });

      const finalUrl = URL.createObjectURL(finalBlob);
      setProcessedPreview(finalUrl);
      setProcessedBlob(finalBlob);

      if (supabase) {
        const fileName = `post-${Date.now()}.jpg`;
        const { data, error } = await supabase.storage
          .from("images")
          .upload(fileName, finalBlob, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (!error) {
           await supabase.from("posts").insert([
            {
              image_path: data?.path,
              price_text: priceText,
              settings: { logoPos, pricePos, priceColor, priceBgColor },
            },
          ]);
           toast.success("Generated & Saved!");
        } else {
             console.warn("Supabase upload failed, using local only.");
             toast.success("Generated (Local)");
        }
      } else {
        toast.success("Generated (Local)");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error processing image.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!processedBlob) return;
    const url = URL.createObjectURL(processedBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `social-post-${Date.now()}.jpg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isLoaded)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );

  return (
    <main className="min-h-screen flex flex-col items-center bg-slate-50 p-4 md:p-8 font-sans">
      <div className="w-full max-w-6xl flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
          Social Post AI
        </h1>
        <Link href="/settings">
          <Button variant="outline" className="gap-2">
            <Settings className="w-4 h-4" /> Settings
          </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {/* LEFT: Controls */}
        <Card className="h-fit border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-8">
            {/* 1. Main Image */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-900">
                1. Product Image
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`group h-32 w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
                  originalFile
                    ? "border-green-300 bg-green-50/50"
                    : "border-slate-300 hover:border-blue-400"
                }`}
              >
                {originalFile ? (
                  <img
                    src={originalPreview!}
                    className="h-full w-full object-contain p-2"
                    alt="preview"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <Upload className="w-6 h-6 mx-auto mb-1" />
                    <p className="text-xs font-medium">Click to upload</p>
                  </div>
                )}
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleMainImageSelect}
              />
            </div>

            <div className="h-px bg-slate-100" />

            {/* 2. Overlays */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-900">
                  2. Customize
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="h-6 text-xs text-blue-600 hover:text-blue-700 px-2"
                >
                  <Sliders className="w-3 h-3 mr-1" />{" "}
                  {showAdvanced ? "Simple" : "Advanced"}
                </Button>
              </div>

              {/* LOGO */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Logo
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoFile ? "Replace" : "Upload"}
                  </Button>
                </div>
                <Input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                />

                {showAdvanced && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 flex items-center gap-1">
                          <ZoomIn className="w-3 h-3" /> Size
                        </label>
                        <input
                          type="range"
                          min="0.2"
                          max="2.0"
                          step="0.1"
                          value={logoScale}
                          onChange={(e) =>
                            setLogoScale(parseFloat(e.target.value))
                          }
                          className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 flex items-center gap-1">
                          <RotateCw className="w-3 h-3" /> Rotate
                        </label>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          value={logoRotation}
                          onChange={(e) =>
                            setLogoRotation(parseInt(e.target.value))
                          }
                          className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                        <Move className="w-3 h-3" /> Position (X / Y)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={logoX}
                          onChange={(e) => setLogoX(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={logoY}
                          onChange={(e) => setLogoY(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {!showAdvanced && (
                  <select
                    className="w-full text-xs border rounded p-1 mt-1"
                    value={logoPos}
                    onChange={(e) =>
                      setLogoPos(e.target.value as CornerPosition)
                    }
                  >
                    <option value="top-right">Pos: Top Right</option>
                    <option value="top-left">Pos: Top Left</option>
                    <option value="bottom-right">Pos: Bottom Right</option>
                    <option value="bottom-left">Pos: Bottom Left</option>
                  </select>
                )}
              </div>

              {/* PRICE */}
              <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase">
                  Price Tag
                </span>
                <div className="flex gap-2">
                  <Input
                    value={priceText}
                    onChange={(e) => setPriceText(e.target.value)}
                    placeholder="1500"
                    className="font-medium h-8 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2 bg-white p-1 rounded border">
                    <input
                      type="color"
                      value={priceColor}
                      onChange={(e) => setPriceColor(e.target.value)}
                      className="h-4 w-4 rounded-full cursor-pointer border-none p-0"
                    />
                    <span className="text-[10px] text-slate-400">Text</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-1 rounded border">
                    <input
                      type="color"
                      value={priceBgColor}
                      onChange={(e) => setPriceBgColor(e.target.value)}
                      className="h-4 w-4 rounded-full cursor-pointer border-none p-0"
                    />
                    <span className="text-[10px] text-slate-400">Bg</span>
                  </div>
                </div>

                {showAdvanced && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 flex items-center gap-1">
                          <ZoomIn className="w-3 h-3" /> Size
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.1"
                          value={priceScale}
                          onChange={(e) =>
                            setPriceScale(parseFloat(e.target.value))
                          }
                          className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 flex items-center gap-1">
                          <RotateCw className="w-3 h-3" /> Rotate
                        </label>
                        <input
                          type="range"
                          min="-45"
                          max="45"
                          value={priceRotation}
                          onChange={(e) =>
                            setPriceRotation(parseInt(e.target.value))
                          }
                          className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                        <Move className="w-3 h-3" /> Position (X / Y)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={priceX}
                          onChange={(e) => setPriceX(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                        />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={priceY}
                          onChange={(e) => setPriceY(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {!showAdvanced && (
                  <select
                    className="w-full text-xs border rounded p-1 mt-1"
                    value={pricePos}
                    onChange={(e) =>
                      setPricePos(e.target.value as CornerPosition)
                    }
                  >
                    <option value="bottom-right">Pos: Bottom Right</option>
                    <option value="bottom-left">Pos: Bottom Left</option>
                    <option value="top-right">Pos: Top Right</option>
                    <option value="top-left">Pos: Top Left</option>
                  </select>
                )}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md"
              onClick={handleProcess}
              disabled={loading || !originalFile}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" /> Generate Post
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* RIGHT: Preview */}
        <div className="lg:col-span-2">
          <Card className="h-full border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <CardContent className="p-0 flex-1 bg-[url('https://bg-remover-checkerboard.vercel.app/checkerboard.png')] bg-repeat flex items-center justify-center min-h-[500px] relative">
              {loading && (
                <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-lg font-medium text-slate-700">
                    Creating Post...
                  </p>
                </div>
              )}
              {processedPreview ? (
                <img
                  src={processedPreview}
                  className="max-w-full max-h-[600px] object-contain shadow-2xl"
                  alt="Final Result"
                />
              ) : (
                <div className="text-center p-8 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm max-w-sm mx-auto">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ImagePlus className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-slate-500 text-sm">
                    Upload & Generate to preview
                  </p>
                </div>
              )}
            </CardContent>
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
              <Button
                size="lg"
                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white shadow-sm"
                disabled={!processedPreview}
                onClick={handleDownload}
              >
                <Download className="w-4 h-4 mr-2" /> Download
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}