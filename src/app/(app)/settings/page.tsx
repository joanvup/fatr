import { requirePermission } from "@/lib/dal";
import { getSettings, formMeta, institutionLogo, institutionName, requiresSignature } from "@/lib/settings";
import { FORM_KEYS } from "@/lib/constants";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const settings = await getSettings();

  const forms = FORM_KEYS.map((key) => ({
    key,
    ...formMeta(settings, key),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Configuración"
        description="Identidad institucional y metadatos que se imprimen en los formatos oficiales PM-04-F22 a PM-04-F25."
      />
      <SettingsForm
        institutionName={institutionName(settings)}
        schoolYear={settings["school.year"] ?? "2026"}
        requireSignature={requiresSignature(settings)}
        logoUrl={institutionLogo(settings)}
        forms={forms}
      />
    </div>
  );
}
