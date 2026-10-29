"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

type LoginState = { error?: string };

const attempts = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function tooManyAttempts(email: string) {
  const now = Date.now();
  const entry = attempts.get(email);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(email, { count: 1, firstAt: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  if (tooManyAttempts(email)) {
    return { error: "Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
    attempts.delete(email);
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Correo o contraseña incorrectos." };
      }
      return { error: "No fue posible iniciar sesión. Inténtalo de nuevo." };
    }
    // signIn redirige lanzando NEXT_REDIRECT; en ese caso el acceso fue válido.
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      attempts.delete(email);
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
