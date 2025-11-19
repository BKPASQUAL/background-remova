import { removeBackground } from "@imgly/background-removal";

export async function processImage(imageFile: File): Promise<Blob> {
  // 1. Remove background (returns a Blob with transparency)
  const transparentBlob = await removeBackground(imageFile);

  // 2. Convert Blob to an Image Bitmap to draw on Canvas
  const imageBitmap = await createImageBitmap(transparentBlob);

  // 3. Create a Canvas
  const canvas = document.createElement("canvas");
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Could not get canvas context");

  // 4. Fill with White Background
  ctx.fillStyle = "#FFFFFF"; // White color
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 5. Draw the cut-out object on top
  ctx.drawImage(imageBitmap, 0, 0);

  // 6. Convert Canvas back to Blob (JPEG is good for non-transparent images)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas to Blob failed"));
      },
      "image/jpeg",
      0.95
    );
  });
}
