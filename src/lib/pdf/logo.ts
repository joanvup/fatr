import fs from "node:fs";
import path from "node:path";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

/**
 * React-PDF no resuelve rutas de `public`; el logo se entrega como data URI.
 * Si el archivo no existe se devuelve cadena vacía y el encabezado usa el recuadro.
 */
export function resolveLogoSource(value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("data:")) return value;
  if (/^https?:\/\//.test(value)) return value;
  const relative = value.startsWith("/") ? value.slice(1) : value;
  const absolute = path.join(process.cwd(), "public", relative);
  try {
    const buffer = fs.readFileSync(absolute);
    const mime = MIME_BY_EXT[path.extname(absolute).toLowerCase()] ?? "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}
