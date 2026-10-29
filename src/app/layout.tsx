import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FATR · Learning Center",
    template: "%s · FATR",
  },
  description:
    "Herramienta de observación y evaluación formativa del Learning Center: observaciones por curso, seguimientos, relación de atención y asistencia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
        <Toaster richColors position="top-right" closeButton />
      </body>
    </html>
  );
}
