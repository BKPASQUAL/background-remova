"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import {
  processImage,
  preloadModel,
  type CornerPosition,
} from "../utils/processImage";
import { useSettings } from "../hooks/useSettings";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Loader2,
  Upload,
  Download,
  RefreshCw,
  Settings,
  Check,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const { settings, isLoaded } = useSettings();
  const [loading, setLoading] = useState(false);

  // --- Inputs ---
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // --- Settings ---
  const [priceText, setPriceText] = useState<string>("");
  const [logoPos, setLogoPos] = useState<CornerPosition>("top-right");
  const [pricePos, setPricePos] = useState<CornerPosition>("bottom-right");

  // --- NEW: Colors ---
  const [priceColor, setPriceColor] = useState<string>("#FFFFFF"); // Default White Text
  const [priceBgColor, setPriceBgColor] = useState<string>("#E11D48"); // Default Red Bg

  // --- Previews ---
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    preloadModel();
  }, []);

  // Load defaults from Settings
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
      setProcessedBlob(null);
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
      // Generate image with ALL options including new colors
      const finalBlob = await processImage(originalFile, {
        logoFile,
        logoPosition: logoPos,
        priceText,
        pricePosition: pricePos,
        priceColor,
        priceBgColor,
      });

      const finalUrl = URL.createObjectURL(finalBlob);
      setProcessedPreview(finalUrl);
      setProcessedBlob(finalBlob);

      if (supabase) {
        const fileName = `post-${Date.now()}.jpg`;
        const { data: storageData, error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, finalBlob, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (!uploadError && storageData) {
          await supabase.from("posts").insert([
            {
              image_path: storageData.path,
              price_text: priceText,
              settings: { logoPos, pricePos, priceColor, priceBgColor },
            },
          ]);
          toast.success("Image generated & saved!");
        } else {
          console.warn("Upload failed, but local preview works.");
        }
      } else {
        toast.success("Image generated (Local)");
      }
    } catch (error) {
      console.error("Processing failed:", error);
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
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        {/* LEFT COLUMN: Controls */}
        <Card className="h-fit border-slate-200 shadow-sm">
          <CardContent className="p-6 space-y-8">
            {/* 1. Main Image */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-900 flex justify-between">
                1. Product Image
                {originalFile && (
                  <span className="text-green-600 text-xs bg-green-50 px-2 py-0.5 rounded-full">
                    Ready
                  </span>
                )}
              </label>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`
                  group h-40 w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all
                  ${
                    originalFile
                      ? "border-green-300 bg-green-50/50"
                      : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50"
                  }
                `}
              >
                {originalFile ? (
                  <img
                    src={originalPreview!}
                    className="h-full w-full object-contain p-2"
                    alt="preview"
                  />
                ) : (
                  <div className="text-center text-slate-400 group-hover:text-blue-500 transition-colors">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm font-medium">Click to upload</p>
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

            {/* 2. Customize */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-900">
                  2. Overlays
                </label>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                  Customize
                </span>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-slate-500 uppercase">
                  Logo
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-slate-600"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    {logoFile ? "Change Logo" : "Upload Logo"}
                  </Button>
                  {logoFile && (
                    <Check className="w-5 h-5 text-green-500 self-center" />
                  )}
                </div>
                <Input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelect}
                />
              </div>

              {/* Price Input Section */}
              <div className="space-y-3">
                <span className="text-xs font-medium text-slate-500 uppercase">
                  Price Tag
                </span>
                <div className="flex gap-2">
                  <Input
                    value={priceText}
                    onChange={(e) => setPriceText(e.target.value)}
                    placeholder="1500"
                    className="font-medium"
                  />
                </div>

                {/* --- NEW: Color Pickers --- */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2 rounded-md border border-slate-100">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={priceColor}
                        onChange={(e) => setPriceColor(e.target.value)}
                        className="h-6 w-6 rounded cursor-pointer border border-slate-300 p-0 bg-transparent"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">
                        {priceColor}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 uppercase font-bold">
                      Bg Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={priceBgColor}
                        onChange={(e) => setPriceBgColor(e.target.value)}
                        className="h-6 w-6 rounded cursor-pointer border border-slate-300 p-0 bg-transparent"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">
                        {priceBgColor}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Positions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase">
                    Price Pos
                  </label>
                  <select
                    className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white text-slate-700"
                    value={pricePos}
                    onChange={(e) =>
                      setPricePos(e.target.value as CornerPosition)
                    }
                  >
                    <option value="bottom-right">BR</option>
                    <option value="bottom-left">BL</option>
                    <option value="top-right">TR</option>
                    <option value="top-left">TL</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 uppercase">
                    Logo Pos
                  </label>
                  <select
                    className="w-full text-xs border border-slate-200 rounded p-1.5 bg-white text-slate-700"
                    value={logoPos}
                    onChange={(e) =>
                      setLogoPos(e.target.value as CornerPosition)
                    }
                  >
                    <option value="top-right">TR</option>
                    <option value="top-left">TL</option>
                    <option value="bottom-right">BR</option>
                    <option value="bottom-left">BL</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all hover:shadow-lg"
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

        {/* RIGHT COLUMN: Preview */}
        <div className="lg:col-span-2">
          <Card className="h-full border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <CardContent className="p-0 flex-1 bg-[url('https://bg-remover-checkerboard.vercel.app/checkerboard.png')] bg-repeat flex items-center justify-center min-h-[500px] relative">
              {loading && (
                <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-lg font-medium text-slate-700">
                    Creating your masterpiece...
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Removing background & adding overlays
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
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImagePlus className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900">
                    No Result Yet
                  </h3>
                  <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                    Upload a product image on the left, set your price, and
                    click "Generate Post" to see the magic happen.
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
                <Download className="w-4 h-4 mr-2" /> Download Final Image
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
