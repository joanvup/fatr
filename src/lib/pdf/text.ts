/** Recorta texto para celdas de ancho fijo y normaliza espacios. */
export function clip(value: string | null | undefined, max = 80): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "—";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export function chunk<T>(items: T[], size: number): T[][] {
  const safeSize = Math.max(1, size);
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += safeSize) {
    pages.push(items.slice(index, index + safeSize));
  }
  return pages.length > 0 ? pages : [[]];
}

export function yesNo(value: boolean | null | undefined): string {
  if (value === true) return "Sí";
  if (value === false) return "No";
  return "—";
}
