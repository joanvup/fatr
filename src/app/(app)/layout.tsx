import { requireUser } from "@/lib/dal";
import { getSettings, institutionName } from "@/lib/settings";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const settings = await getSettings();

  return (
    <AppShell
      user={user}
      schoolYear={settings["school.year"] ?? "2026"}
      institutionName={institutionName(settings)}
    >
      {children}
    </AppShell>
  );
}
