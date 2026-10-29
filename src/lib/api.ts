import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/dal";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("host");
  try {
    if (new URL(origin).host !== host) {
      throw new HttpError(403, "Origen no permitido.");
    }
  } catch {
    throw new HttpError(403, "Origen no permitido.");
  }
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Datos inválidos.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "El cuerpo de la solicitud no es JSON válido.");
  }
}
