import { removeBackground, preload, Config } from "@imgly/background-removal";

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
  | "bottom-right";

export interface ProcessOptions {
  logoFile?: File | null;
  logoPosition?: CornerPosition;
  priceText?: string;
  pricePosition?: CornerPosition;
  priceColor?: string; // Hex code for text
  priceBgColor?: string; // Hex code for background box
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

    // 4. Draw Main Object (Centered with padding)
    const scale = Math.min(
      (targetSize * 0.9) / imageBitmap.width,
      (targetSize * 0.9) / imageBitmap.height
    );
    const newWidth = imageBitmap.width * scale;
    const newHeight = imageBitmap.height * scale;
    const x = (targetSize - newWidth) / 2;
    const y = (targetSize - newHeight) / 2;
    ctx.drawImage(imageBitmap, x, y, newWidth, newHeight);

    // Helper to calculate corner coordinates
    const padding = 40;
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

    // 5. Draw Logo
    if (options.logoFile) {
      const logoBitmap = await createImageBitmap(options.logoFile);
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

    // 6. Draw Price Tag
    if (options.priceText) {
      // Format Price Logic: Enforce "Rs XXXX/=" format
      let displayText = options.priceText.trim();

      // Remove existing non-numeric chars to normalize first (optional, but safer)
      const numericValue = displayText.replace(/[^0-9.]/g, "");

      if (numericValue) {
        displayText = `Rs ${numericValue}/=`;
      }

      // Font settings
      const fontSize = 56;
      ctx.font = `bold ${fontSize}px sans-serif`;
      const metrics = ctx.measureText(displayText);

      // Background Box dimensions
      const bgPadding = 16;
      const bgW = metrics.width + bgPadding * 2;
      const bgH = fontSize + bgPadding * 2; // Approximation

      const pos = getCoords(bgW, bgH, options.pricePosition || "bottom-right");

      // Draw Background Box (Use custom color or default Red)
      ctx.fillStyle = options.priceBgColor || "#E11D48";
      ctx.beginPath();
      ctx.roundRect(pos.x, pos.y, bgW, bgH, 12);
      ctx.fill();

      // Draw Text (Use custom color or default White)
      ctx.fillStyle = options.priceColor || "#FFFFFF";
      ctx.textBaseline = "top";
      ctx.fillText(displayText, pos.x + bgPadding, pos.y + bgPadding + 4);
    }

    // 7. Export final composite
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
    console.warn("Advanced processing failed, falling back...", error);
    return await removeBackground(imageFile);
  }
}
