import { chromium } from 'playwright';
const browser = await chromium.launch();
for (const wait of [500, 1000, 1500, 2000, 3000]) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.goto(process.argv[2]); await page.waitForTimeout(6000);
  await page.getByText('Skip', { exact: true }).last().click(); await page.waitForTimeout(1500);
  await page.getByPlaceholder('e.g. Cath').fill('Cath'); await page.waitForTimeout(400);
  for (const t of ['Continue','Worry less about money','Continue','Continue','No, just me']) { await page.getByText(t,{exact:true}).last().click(); await page.waitForTimeout(1200); }
  await page.getByText('See my Home',{exact:true}).last().click();
  await page.waitForTimeout(wait);
  await page.touchscreen.tap(352, 36);
  await page.waitForTimeout(1200);
  console.log(`tap ${wait} ms after See my Home -> bell opened:`, await page.getByText('Nothing needs your attention', { exact: false }).first().isVisible().catch(() => false));
  await page.close();
}
await browser.close();
