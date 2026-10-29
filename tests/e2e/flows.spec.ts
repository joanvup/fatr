import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

const PASSWORD = "Admin123!";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

async function expectPdf(page: Page, href: string) {
  const response = await page.context().request.get(href);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/pdf");
  const pdf = await PDFDocument.load(await response.body());
  expect(pdf.getPageCount()).toBeGreaterThan(0);
  return pdf;
}

test("administración navega el sistema y descarga los cuatro formatos oficiales", async ({ page }) => {
  await login(page, "admin@fatr.local");
  await expect(page.getByRole("heading", { name: /^Hola,/ })).toBeVisible();

  await page.goto("/observations");
  const cycleHref = await page.locator('a[href^="/observations/"]').first().getAttribute("href");
  expect(cycleHref).toBeTruthy();
  const cycleId = cycleHref!.split("/").pop();
  await expectPdf(page, `/api/pdf/f22?cycleId=${cycleId}`);

  await page.goto("/follow-ups");
  const f23Href = await page.locator('a[href^="/api/pdf/f23"]').first().getAttribute("href");
  expect(f23Href).toBeTruthy();
  await expectPdf(page, f23Href!);

  await page.goto("/attention");
  const f24Href = await page.locator('a[href^="/api/pdf/f24"]').first().getAttribute("href");
  expect(f24Href).toBeTruthy();
  await expectPdf(page, f24Href!);

  await page.goto("/attendance");
  const f25Href = await page.locator('a[href^="/api/pdf/f25"]').first().getAttribute("href");
  expect(f25Href).toBeTruthy();
  await expectPdf(page, f25Href!);

  await page.goto("/import-export");
  await expect(page.getByRole("heading", { name: "Datos y reportes" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Exportar estudiantes/i })).toBeVisible();
});

test("docencia queda excluida de F23, diagnóstico y datos", async ({ page }) => {
  await login(page, "docente1@fatr.local");

  const followUps = await page.goto("/follow-ups");
  expect(followUps?.status()).toBe(404);

  const privatePdf = await page.context().request.get("/api/pdf/f23?id=seed-f1");
  expect(privatePdf.status()).toBe(403);

  const importPage = await page.goto("/import-export");
  expect(importPage?.status()).toBe(404);

  const template = await page.context().request.get("/api/templates/students");
  expect(template.status()).toBe(403);

  const exportRequest = await page.context().request.get("/api/export/students");
  expect(exportRequest.status()).toBe(403);
});

test("terapeuta consulta seguimientos y firmas digitales", async ({ page }) => {
  await login(page, "terapeuta1@fatr.local");

  await page.goto("/follow-ups");
  await expect(page.getByRole("heading", { name: "Seguimientos por estudiante" })).toBeVisible();
  const f23Href = await page.locator('a[href^="/api/pdf/f23"]').first().getAttribute("href");
  expect(f23Href).toBeTruthy();
  await expectPdf(page, f23Href!);

  await page.goto("/attendance?date=2026-10-29");
  const signature = page.locator('img[src^="/api/signatures/"]').first();
  await expect(signature).toBeVisible();
  const src = await signature.getAttribute("src");
  const response = await page.context().request.get(src!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
});
