import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.locator(".workflow-track").scrollIntoViewIfNeeded();
await page.waitForTimeout(950);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(300);
await page.screenshot({
  path: "artifacts/landing-desktop.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Choose Lilac" }).click();
await page.getByRole("button", { name: "Rotate bag right" }).click();
await page.getByRole("button", { name: "Pause animation" }).click();
await page.getByRole("tab", { name: "2 The details" }).click();
await page
  .getByRole("button", { name: "Explore the demo", exact: true })
  .click();
await page
  .getByRole("heading", { name: "Your collection, coming together." })
  .waitFor();
await page.waitForTimeout(400);
await page.screenshot({ path: "artifacts/studio-desktop.png", fullPage: true });
await page.getByRole("textbox", { name: "Search catalog" }).fill("tote");
await page.waitForFunction(
  () => document.querySelectorAll(".catalog-card").length === 1,
);
await page.getByRole("textbox", { name: "Search catalog" }).fill("");
await page.getByRole("button", { name: "List view" }).click();
await page.getByRole("button", { name: "Grid view" }).click();
await page.locator(".catalog-card").first().click();
await page.getByRole("dialog").waitFor();
await page.keyboard.press("Escape");
await page
  .getByRole("button", { name: "Add a product", exact: true })
  .first()
  .click();
await page.getByRole("button", { name: "Use sample product" }).click();
await page
  .getByRole("textbox", { name: "Product title" })
  .fill("Hackathon sample tote");
await page.getByRole("button", { name: "Add to review queue" }).click();
await page.getByRole("button", { name: "Back to my catalog" }).click();
await page.getByRole("button", { name: "Review queue", exact: true }).click();
await page.getByRole("heading", { name: "Hackathon sample tote" }).waitFor();
await page
  .locator(".review-row")
  .filter({ hasText: "Hackathon sample tote" })
  .getByRole("button", { name: "Approve", exact: true })
  .click();
await page.getByRole("button", { name: "Export catalog", exact: true }).click();
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Download CSV", exact: true }).click();
const download = await downloadPromise;
await download.saveAs("artifacts/demo-catalog.csv");
await page.getByRole("button", { name: "Dark appearance" }).click();
await page.getByRole("button", { name: "My catalog", exact: true }).click();
await page.waitForTimeout(350);
await page.screenshot({ path: "artifacts/studio-dark.png", fullPage: true });
await page.getByRole("button", { name: "Light appearance" }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: "artifacts/studio-mobile.png", fullPage: true });
const studioOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
await page.getByRole("button", { name: "Katalogit AI home" }).click();
await page.waitForTimeout(1300);
await page.locator(".workflow-track").scrollIntoViewIfNeeded();
await page.waitForTimeout(950);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.waitForTimeout(350);
await page.screenshot({ path: "artifacts/landing-mobile.png", fullPage: true });
const landingOverflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
await page.emulateMedia({ reducedMotion: "reduce" });
await page.reload({ waitUntil: "networkidle" });
await page.screenshot({
  path: "artifacts/landing-reduced-motion.png",
  fullPage: true,
});
await writeFile(
  "artifacts/preview-results.json",
  JSON.stringify(
    {
      errors,
      studioOverflow,
      landingOverflow,
      download: download.suggestedFilename(),
    },
    null,
    2,
  ),
);
await browser.close();
if (errors.length || studioOverflow || landingOverflow)
  throw new Error(
    "Browser checks reported issues; see artifacts/preview-results.json",
  );
console.log(
  "Browser checks passed: landing, 3D controls, sample workflow, search, views, product dialog, add, review, CSV export, dark mode, mobile, reduced motion.",
);
