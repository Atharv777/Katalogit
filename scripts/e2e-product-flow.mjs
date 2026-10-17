import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const out = "artifacts/e2e-product-flow";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:3000/#/studio");
  await page.getByRole("button", { name: "Add a product" }).first().click();
  if (process.argv.includes("--quick")) {
    await page.locator(".flow-quick + input[type=file]").setInputFiles("artifacts/smoke-product-flow/source.png");
    await page.getByRole("heading", { name: /Photograph your bags/ }).waitFor({ timeout: 90_000 });
  } else {
    await page.getByRole("button", { name: /Bags & luggage/ }).click();
    await page.locator('input[type="file"]').first().setInputFiles("artifacts/smoke-product-flow/source.png");
  }
  await page.getByRole("button", { name: /Continue/ }).click();
  await page.locator(".flow-notes").fill("Structured coral handbag. Suggested price 2499 rupees.");
  await page.getByRole("button", { name: /Write it and shoot the set/ }).click();
  await page.getByRole("heading", { name: "Check it before it ships" }).waitFor({ timeout: 150_000 });
  await page.screenshot({ path: `${out}/review.png`, fullPage: true });
  const title = await page.locator('.flow-fields input').first().inputValue();
  const finish = await page.locator(".flow-tile figcaption").first().textContent();
  if (!finish?.includes("Studio finish") && !finish?.includes("AI edit")) {
    throw new Error(`No finished product image: ${finish}`);
  }
  if (!(await page.getByText("Seen in your photo:", { exact: false }).count())) {
    throw new Error("The photo analysis was not preserved in the review step.");
  }
  await page.getByRole("button", { name: "Save to catalogue" }).click();
  await page.getByRole("heading", { name: "Saved to your catalogue" }).waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "Back to catalogue" }).click();
  await page.getByText(title, { exact: true }).first().waitFor({ timeout: 10_000 });
  await page.screenshot({ path: `${out}/catalog.png`, fullPage: true });
  console.log(JSON.stringify({ title, finish, errors, saved: true }));
} finally {
  await browser.close();
}
