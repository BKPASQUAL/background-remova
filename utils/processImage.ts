import { removeBackground, preload, Config } from "@imgly/background-removal";

const config: Config = {
  debug: true,
  // device: 'gpu',
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
    console.log("Preloading AI model...");
    await preload(config);
    console.log("AI model preloaded successfully.");
  } catch (error) {
    console.error("Preloading failed:", error);
  }
}

// Define types for our new options
export type CornerPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface ProcessOptions {
  logoFile?: File | null;
  logoPosition?: CornerPosition;
  priceText?: string;
  pricePosition?: CornerPosition;
}

export async function processImage(
  imageFile: File,
  options: ProcessOptions = {}
): Promise<Blob> {
  try {
    // 1. Remove background
    const transparentBlob = await removeBackground(imageFile, config);
    const imageBitmap = await createImageBitmap(transparentBlob);

    // 2. Setup 720x720 Canvas
    const targetSize = 720;
    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Could not get canvas context");

    // 3. Fill White Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, targetSize, targetSize);

    // 4. Draw Main Object (Centered)
    const scale = Math.min(
      (targetSize * 0.9) / imageBitmap.width,
      (targetSize * 0.9) / imageBitmap.height
    );
    const newWidth = imageBitmap.width * scale;
    const newHeight = imageBitmap.height * scale;
    const x = (targetSize - newWidth) / 2;
    const y = (targetSize - newHeight) / 2;
    ctx.drawImage(imageBitmap, x, y, newWidth, newHeight);

    // --- Helper to get coordinates for corners ---
    const padding = 30; // Padding from the edge
    const getCoords = (w: number, h: number, pos: CornerPosition) => {
      switch (pos) {
        case "top-left":
          return { x: padding, y: padding };
        case "top-right":
          return { x: targetSize - w - padding, y: padding };
        case "bottom-left":
          return { x: padding, y: targetSize - h - padding };
        case "bottom-right":
          return { x: targetSize - w - padding, y: targetSize - h - padding };
        default:
          return { x: padding, y: padding };
      }
    };

    // 5. Draw Logo (if provided)
    if (options.logoFile) {
      const logoBitmap = await createImageBitmap(options.logoFile);
      // Resize logo to be reasonable (e.g., max 150px width/height)
      const logoMaxSize = 150;
      const logoScale = Math.min(
        logoMaxSize / logoBitmap.width,
        logoMaxSize / logoBitmap.height
      );
      const logoW = logoBitmap.width * logoScale;
      const logoH = logoBitmap.height * logoScale;

      const pos = getCoords(logoW, logoH, options.logoPosition || "top-right");
      ctx.drawImage(logoBitmap, pos.x, pos.y, logoW, logoH);
    }

    // 6. Draw Price Tag (if provided)
    if (options.priceText) {
      const fontSize = 48;
      ctx.font = `bold ${fontSize}px sans-serif`;
      const text = options.priceText;
      const metrics = ctx.measureText(text);

      // Background for price (optional, makes it pop)
      const bgPadding = 10;
      const bgW = metrics.width + bgPadding * 2;
      const bgH = fontSize + bgPadding * 2; // approx height

      // We need coordinates based on the BACKGROUND box size, not just text
      const pos = getCoords(bgW, bgH, options.pricePosition || "bottom-right");

      // Draw Red/Black tag background
      ctx.fillStyle = "#FF0000"; // Red tag
      // Fixed typo here: removed 'ZF'
      ctx.fillRect(pos.x, pos.y, bgW, bgH);

      // Draw Text centered in that box
      ctx.fillStyle = "#FFFFFF"; // White text
      ctx.textBaseline = "top";
      ctx.fillText(text, pos.x + bgPadding, pos.y + bgPadding);
    }

    // 7. Export
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas to Blob failed"));
        },
        "image/jpeg",
        0.9
      );
    });
  } catch (error) {
    console.warn("Optimized config failed, retrying with defaults...", error);
    return await removeBackground(imageFile);
  }
}
