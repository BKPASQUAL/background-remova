"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { processImage } from "@/utils/processImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Download } from "lucide-react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview of original
    setOriginalImage(URL.createObjectURL(file));
    setLoading(true);
    setProcessedImage(null);

    try {
      // 1. Process the image (Remove BG + Add White BG)
      const finalBlob = await processImage(file);
      const finalUrl = URL.createObjectURL(finalBlob);
      setProcessedImage(finalUrl);

      // 2. Upload to Supabase (Optional: if you want to save it)
      const fileName = `processed-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("images")
        .upload(fileName, finalBlob, { contentType: "image/jpeg" });

      if (error) {
        console.error("Supabase upload failed:", error.message);
      } else {
        console.log("Saved to Supabase:", data.path);
      }
    } catch (error) {
      console.error("Error processing image:", error);
      alert("Something went wrong processing the image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <h1 className="text-3xl font-bold mb-8 text-slate-800">
        AI Background Remover
      </h1>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Input Section */}
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold">Original Image</h2>
            <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300">
              {originalImage ? (
                <img
                  src={originalImage}
                  alt="Original"
                  className="object-contain h-full w-full"
                />
              ) : (
                <div className="text-slate-400 flex flex-col items-center">
                  <Upload className="w-10 h-10 mb-2" />
                  <p>No image selected</p>
                </div>
              )}
            </div>

            <div className="w-full">
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Select Image
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={loading}
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Output Section */}
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-4">
            <h2 className="text-xl font-semibold">Processed (White BG)</h2>
            <div className="w-full aspect-square bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200">
              {loading ? (
                <div className="flex flex-col items-center text-slate-500">
                  <Loader2 className="w-10 h-10 animate-spin mb-2" />
                  <p>Removing background...</p>
                </div>
              ) : processedImage ? (
                <img
                  src={processedImage}
                  alt="Processed"
                  className="object-contain h-full w-full"
                />
              ) : (
                <p className="text-slate-400">Waiting for image...</p>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!processedImage}
              onClick={() => {
                if (processedImage) {
                  const link = document.createElement("a");
                  link.href = processedImage;
                  link.download = "white-bg-image.jpg";
                  link.click();
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Image
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
