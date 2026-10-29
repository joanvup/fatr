import { describe, expect, it } from "vitest";
import { chunk, clip, yesNo } from "@/lib/pdf/text";

describe("utilidades de PDF", () => {
  it("recorta textos largos y conserva marcadores finales", () => {
    expect(clip("  hola   mundo ", 40)).toBe("hola mundo");
    expect(clip(null)).toBe("—");
    const text = "a".repeat(50);
    const clipped = clip(text, 10);
    expect(clipped).toHaveLength(10);
    expect(clipped.endsWith("…")).toBe(true);
  });

  it("pagina filas respetando el tamaño de página", () => {
    const rows = Array.from({ length: 21 }, (_, index) => index + 1);
    const pages = chunk(rows, 20);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(20);
    expect(pages[1]).toEqual([21]);
    expect(chunk([], 20)).toEqual([[]]);
  });

  it("traduce valores booleanos del formulario", () => {
    expect(yesNo(true)).toBe("Sí");
    expect(yesNo(false)).toBe("No");
    expect(yesNo(null)).toBe("—");
  });
});
