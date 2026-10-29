import { expect, test, type Page } from "@playwright/test";

const PASSWORD = "Admin123!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

test("el combobox de F23 busca, selecciona y valida por teclado", async ({ page }) => {
  await login(page, "admin@fatr.local");
  await page.goto("/follow-ups/new");

  const combo = page.getByRole("combobox", { name: /Estudiante/ });
  await combo.click();
  await combo.fill("sofia");
  await expect(page.getByRole("option", { name: /Martínez, Sofía/ })).toBeVisible();
  await page.getByRole("option", { name: /Martínez, Sofía/ }).click();
  await expect(combo).toHaveValue(/Martínez, Sofía/);
  await expect(page.locator('input[name="studentId"]')).toHaveValue(/.+/);

  await combo.click();
  await combo.fill("1001");
  await combo.press("ArrowDown");
  await combo.press("Enter");
  await expect(combo).toHaveValue(/Martínez, Sofía/);

  await combo.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await combo.press("Escape");
  await expect(page.getByRole("listbox")).toHaveCount(0);

  await page.getByRole("button", { name: "Limpiar estudiante" }).click();
  await expect(combo).toHaveValue("");
  const valid = await combo.evaluate((element) => (element.closest("form") as HTMLFormElement).checkValidity());
  expect(valid).toBe(false);
});

test("el combobox de F25 sustituye al buscador separado", async ({ page }) => {
  await login(page, "admin@fatr.local");
  await page.goto("/attendance");

  await expect(page.getByLabel("Buscar estudiante")).toHaveCount(0);
  const combo = page.getByRole("combobox", { name: /Estudiante/ });
  await combo.click();
  await combo.fill("valeria");
  const option = page.getByRole("option", { name: /Valeria/ }).first();
  await expect(option).toBeVisible();
  await option.click();
  await expect(combo).toHaveValue(/Valeria/);
});
