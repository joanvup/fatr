import { ZodError } from "zod";
import { HttpError } from "@/lib/dal";

export type ActionResult = {
  ok?: boolean;
  id?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export function zodResult(error: ZodError): ActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { message: "Revisa los campos marcados.", fieldErrors };
}

export function errorResult(error: unknown): ActionResult {
  if (error instanceof HttpError) return { message: error.message };
  if (error instanceof ZodError) return zodResult(error);
  console.error(error);
  return { message: "Ocurrió un error inesperado. Inténtalo de nuevo." };
}
