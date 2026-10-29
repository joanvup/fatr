"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronLeft, LogOut, Menu, UserRound, X } from "lucide-react";
import type { SessionUser } from "@/lib/dal";
import { ROLE_LABELS } from "@/lib/constants";
import { initials } from "@/lib/utils";
import { badgeForRole } from "@/components/layout/role-badge";
import { navForRole } from "@/components/layout/nav";
import { logoutAction } from "@/server/actions/auth";

const SIDEBAR_KEY = "fatr:sidebar-collapsed";
const SIDEBAR_EVENT = "fatr:sidebar-change";

function subscribeSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_EVENT, callback);
  };
}

function sidebarSnapshot() {
  return window.localStorage.getItem(SIDEBAR_KEY) === "1";
}

function sidebarServerSnapshot() {
  return false;
}

export function AppShell({
  user,
  schoolYear,
  institutionName,
  children,
}: {
  user: SessionUser;
  schoolYear: string;
  institutionName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribeSidebar, sidebarSnapshot, sidebarServerSnapshot);
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = navForRole(user.role);

  function toggleCollapsed() {
    window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="min-h-screen bg-slate-50">
      {mobileOpen ? (
        <button
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-brand-950 text-brand-100 transition-all duration-200",
          collapsed ? "w-[74px]" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white p-1">
            <Image src="/brand/logo.png" alt="" width={28} height={30} className="h-auto w-full" />
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{institutionName}</p>
              <p className="text-[11px] uppercase tracking-wider text-brand-300">FATR · {schoolYear}</p>
            </div>
          ) : null}
          <button
            className="ml-auto rounded-md p-1.5 text-brand-300 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="scroll-thin flex-1 overflow-y-auto px-2 py-3">
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              {!collapsed ? (
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-brand-400">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={[
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-white/12 font-medium text-white"
                            : "text-brand-200 hover:bg-white/5 hover:text-white",
                          collapsed ? "justify-center px-0" : "",
                        ].join(" ")}
                      >
                        <item.icon className="size-4 shrink-0" />
                        {!collapsed ? <span className="truncate">{item.label}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-2">
          <button
            onClick={toggleCollapsed}
            className="hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-brand-300 hover:bg-white/5 hover:text-white lg:flex"
          >
            <ChevronLeft className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed ? "Contraer menú" : null}
          </button>
        </div>
      </aside>

      <div className={collapsed ? "lg:pl-[74px]" : "lg:pl-64"}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </button>
          <div className="hidden text-sm text-slate-500 sm:block">
            Año escolar <span className="font-medium text-slate-800">{schoolYear}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:inline-flex">{badgeForRole(user.role)}</span>
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-slate-200 py-1 pl-1 pr-3 hover:bg-slate-50">
                <span className="grid size-7 place-items-center rounded-full bg-brand-800 text-xs font-semibold text-white">
                  {initials(user.name)}
                </span>
                <span className="hidden max-w-32 truncate text-sm font-medium text-slate-700 sm:block">{user.name}</span>
              </summary>
              <div className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                  <p className="mt-1 text-xs text-brand-700">{ROLE_LABELS[user.role]}</p>
                </div>
                <Link href="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">
                  <UserRound className="size-4" /> Mi cuenta
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="size-4" /> Cerrar sesión
                  </button>
                </form>
              </div>
            </details>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
