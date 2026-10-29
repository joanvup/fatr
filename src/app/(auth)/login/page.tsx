import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-brand-900 p-12 text-white lg:flex">
        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_20%,#5095cc_0,transparent_45%),radial-gradient(circle_at_80%_70%,#2f78b3_0,transparent_40%)]" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-white p-1.5">
            <Image src="/brand/logo.png" alt="Learning Center" width={40} height={42} className="h-auto w-full" priority />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-200">Learning Center</p>
            <p className="text-xs text-brand-300">Formative Assessment Tool Record</p>
          </div>
        </div>
        <div className="relative max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Observación formativa y seguimiento, en un solo lugar.
          </h1>
          <p className="text-sm leading-relaxed text-brand-100">
            Registra las observaciones por curso, los seguimientos individuales, la relación de atención y la
            asistencia diaria de nuestros estudiantes, con documentos oficiales listos para imprimir.
          </p>
          <ul className="space-y-2 text-sm text-brand-100">
            <li>· Formatos PM-04-F22 a PM-04-F25</li>
            <li>· Roles de administración, coordinación, terapia y docencia</li>
            <li>· Exportación PDF y Excel, firmas digitales</li>
          </ul>
        </div>
        <p className="relative text-xs text-brand-300">Uso interno · Información confidencial de estudiantes</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-lg border border-slate-200 bg-white p-1.5">
              <Image src="/brand/logo.png" alt="Learning Center" width={36} height={38} className="h-auto w-full" priority />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-800">Learning Center</p>
              <p className="text-xs text-slate-500">Formative Assessment Tool Record</p>
            </div>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h2>
          <p className="mb-6 mt-1 text-sm text-slate-500">Accede con las credenciales asignadas por administración.</p>
          <LoginForm />
          <p className="mt-6 text-center text-xs text-slate-400">
            ¿Olvidaste tu contraseña? Solicita el restablecimiento a administración.
          </p>
        </div>
      </section>
    </main>
  );
}
