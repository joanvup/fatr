import { Badge } from "@/components/ui/card";
import { ROLE_LABELS, type Role } from "@/lib/constants";

const TONES: Record<Role, "blue" | "violet" | "green" | "amber"> = {
  ADMIN: "violet",
  COORDINATOR: "blue",
  THERAPIST: "green",
  TEACHER: "amber",
};

export function badgeForRole(role: Role) {
  return <Badge tone={TONES[role]}>{ROLE_LABELS[role]}</Badge>;
}
