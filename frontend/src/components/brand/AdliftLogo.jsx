import { useEffect, useState } from "react";
import source from "@/assets/adlift-logo.png";

function prepareLogo(img) {
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = img.naturalWidth;
  sourceCanvas.height = img.naturalHeight;
  const ctx = sourceCanvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const frame = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const pixels = frame.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const isNearWhite = r > 220 && g > 220 && b > 220 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18;
    if (isNearWhite) pixels[i + 3] = 0;
  }

  let minX = sourceCanvas.width;
  let minY = sourceCanvas.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < sourceCanvas.height; y += 1) {
    for (let x = 0; x < sourceCanvas.width; x += 1) {
      const alpha = pixels[(y * sourceCanvas.width + x) * 4 + 3];
      if (alpha > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  ctx.putImageData(frame, 0, 0);

  if (maxX <= minX || maxY <= minY) {
    return sourceCanvas.toDataURL("image/png");
  }

  const pad = 4;
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(sourceCanvas.width, maxX + pad + 1) - sx;
  const sh = Math.min(sourceCanvas.height, maxY + pad + 1) - sy;
  const cropped = document.createElement("canvas");
  cropped.width = sw;
  cropped.height = sh;
  cropped.getContext("2d").drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return cropped.toDataURL("image/png");
}

export function AdliftLogo({ className = "h-20 w-auto" }) {
  const [src, setSrc] = useState(source);

  useEffect(() => {
    const image = new Image();
    image.src = source;
    image.onload = () => setSrc(prepareLogo(image));
  }, []);

  return (
    <img
      src={src}
      alt="Adlift SARL"
      className={`bg-transparent object-contain object-left ${className}`}
    />
  );
}
