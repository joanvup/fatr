import "server-only";
import { HttpError } from "@/lib/dal";
import { MAX_SIGNATURE_BYTES } from "@/lib/constants";

const PNG_SIGNATURE = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Convierte una firma PNG en data URL a bytes, validando tipo y tamaño. */
export function decodeSignature(value: string | undefined, label: string): Uint8Array<ArrayBuffer> | null {
  if (!value) return null;

  if (value.length > Math.ceil(MAX_SIGNATURE_BYTES * 1.4)) {
    throw new HttpError(413, `La firma ${label} supera el límite de 200 KB.`);
  }

  const match = PNG_SIGNATURE.exec(value);
  if (!match) {
    throw new HttpError(400, `La firma ${label} debe ser una imagen PNG.`);
  }

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length === 0) {
    throw new HttpError(400, `La firma ${label} está vacía.`);
  }
  if (buffer.length > MAX_SIGNATURE_BYTES) {
    throw new HttpError(413, `La firma ${label} supera el límite de 200 KB.`);
  }
  if (!buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
    throw new HttpError(400, `La firma ${label} no es un PNG válido.`);
  }

  return new Uint8Array(buffer);
}
