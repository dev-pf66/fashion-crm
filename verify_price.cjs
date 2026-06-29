const { chromium } = require('playwright');
const path = require('path');
const scratchpad = '/tmp/claude-0/-root/e3b78cbc-cf4d-446a-b109-94c117c0efc4/scratchpad';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  await page.goto('http://localhost:4174');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${scratchpad}/01_start.png` });

  // Check for login
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    console.log('Login page found, signing in...');
    await page.fill('input[type="email"]', 'dev@pocket-fund.com');
    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(4000);
    }
  }
  await page.screenshot({ path: `${scratchpad}/02_after_login.png` });
  console.log('Current URL:', page.url());

  // Go to range planning
  await page.goto('http://localhost:4174/range-planning');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${scratchpad}/03_range_planning.png` });

  // List all range links
  const rangeLinks = await page.$$eval('a[href*="/range-planning/"]', els => 
    els.map(e => ({ href: e.getAttribute('href'), text: e.textContent.trim().slice(0, 60) }))
  );
  console.log('Range cards found:', JSON.stringify(rangeLinks));

  // Try Ektaar first, else first range
  const ektaar = rangeLinks.find(l => l.text.toLowerCase().includes('ektaar'));
  const target = ektaar || rangeLinks[0];
  if (!target) { console.log('No ranges found'); await browser.close(); return; }

  console.log('Opening range:', target.text, target.href);
  await page.goto(`http://localhost:4174${target.href}`);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${scratchpad}/04_range_detail_full.png` });

  // Dump all .rp-card-tags content
  const tagGroups = await page.$$eval('.rp-card-tags', els =>
    els.map(el => el.innerHTML.trim().replace(/\s+/g, ' '))
  );
  console.log(`\nFound ${tagGroups.length} rp-card-tags elements`);
  tagGroups.slice(0, 5).forEach((html, i) => console.log(`Card ${i+1} tags:`, html));

  // Specifically look for price-like tags
  const allTagTexts = await page.$$eval('.rp-card-tags .tag', els => els.map(e => e.textContent.trim()));
  console.log('\nAll tag texts in card-tags:', JSON.stringify(allTagTexts));

  // Check if any contain price-like patterns (L range or numbers)
  const priceTags = allTagTexts.filter(t => /\d.*L|L.*\d|\d{4,}|\₹/.test(t));
  console.log('Price-looking tags:', JSON.stringify(priceTags));

  await browser.close();
})();
