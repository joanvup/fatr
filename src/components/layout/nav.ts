import {
  Activity,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  Database,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/constants";
import { can, type Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "General",
    items: [
      { href: "/", label: "Panel", icon: LayoutDashboard, permission: "students.read" },
      { href: "/students", label: "Estudiantes", icon: Users, permission: "students.read" },
      { href: "/courses", label: "Cursos", icon: GraduationCap, permission: "courses.read" },
    ],
  },
  {
    label: "Formatos",
    items: [
      { href: "/observations", label: "Observaciones (F22)", icon: ClipboardList, permission: "observations.read" },
      { href: "/follow-ups", label: "Seguimientos (F23)", icon: FileText, permission: "followUps.read" },
      { href: "/attention", label: "Relación de atención (F24)", icon: Activity, permission: "attention.read" },
      { href: "/attendance", label: "Asistencia (F25)", icon: CalendarCheck, permission: "attendance.read" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/catalogs/domains", label: "Catálogos", icon: BookOpen, permission: "courses.read" },
      { href: "/users", label: "Usuarios", icon: ShieldCheck, permission: "users.manage" },
      { href: "/settings", label: "Configuración", icon: Settings, permission: "settings.manage" },
      { href: "/import-export", label: "Datos y reportes", icon: Database, permission: "data.export" },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => can(role, item.permission)),
  })).filter((group) => group.items.length > 0);
}
