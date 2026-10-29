import path from "node:path";
import { Font } from "@react-pdf/renderer";
import { PDF_FONT } from "@/lib/pdf/theme";

let registered = false;

/** Registra Roboto una sola vez por proceso para todos los documentos. */
export function registerPdfFonts() {
  if (registered) return;
  const dir = path.join(process.cwd(), "src", "lib", "pdf", "fonts");
  Font.register({
    family: PDF_FONT,
    fonts: [
      { src: path.join(dir, "Roboto-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(dir, "Roboto-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
