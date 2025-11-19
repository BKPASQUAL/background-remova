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

    // Draw Product
    const scale = Math.min(
      (targetSize * 0.9) / imageBitmap.width,
      (targetSize * 0.9) / imageBitmap.height
    );
    const newWidth = imageBitmap.width * scale;
    const newHeight = imageBitmap.height * scale;
    const x = (targetSize - newWidth) / 2;
    const y = (targetSize - newHeight) / 2;
    ctx.drawImage(imageBitmap, x, y, newWidth, newHeight);

    // Coordinates Helper
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

    // Draw Price
    if (options.priceText) {
      let displayText = options.priceText.trim();
      const numericValue = displayText.replace(/[^0-9.]/g, "");

      // Format as Rs XXXX/=
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
          ctx.shadowColor = "rgba(0,0,0,0.3)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 5;

          ctx.fillStyle = options.priceBgColor || "#E11D48";
          ctx.beginPath();
          ctx.roundRect(pos.x, pos.y, bgW, bgH, 12);
          ctx.fill();

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
