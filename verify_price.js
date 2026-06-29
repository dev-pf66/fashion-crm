const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 900 });

  // Load app
  await page.goto('http://localhost:4174');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/claude-0/-root/e3b78cbc-cf4d-446a-b109-94c117c0efc4/scratchpad/01_login.png' });

  // Check if we're on login page
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await page.fill('input[type="email"]', 'dev@pocket-fund.com');
    const passInput = await page.$('input[type="password"]');
    if (passInput) {
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
    }
  }
  await page.screenshot({ path: '/tmp/claude-0/-root/e3b78cbc-cf4d-446a-b109-94c117c0efc4/scratchpad/02_after_login.png' });

  // Navigate to Range Planning
  const navLinks = await page.$$eval('a', els => els.map(e => ({ href: e.href, text: e.textContent.trim() })));
  console.log('Nav links:', JSON.stringify(navLinks.filter(l => l.text.length < 30).slice(0, 20)));

  await page.goto('http://localhost:4174/range-planning');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/claude-0/-root/e3b78cbc-cf4d-446a-b109-94c117c0efc4/scratchpad/03_range_planning.png' });

  // Find range cards and click Ektaar or first one
  const rangeLinks = await page.$$eval('a[href*="/range-planning/"]', els => els.map(e => ({ href: e.href, text: e.textContent.trim().slice(0, 50) })));
  console.log('Range links:', JSON.stringify(rangeLinks.slice(0, 10)));

  // Find Ektaar specifically
  const ektaarLink = rangeLinks.find(l => l.text.toLowerCase().includes('ektaar'));
  const target = ektaarLink || rangeLinks[0];
  if (target) {
    await page.goto(target.href);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/tmp/claude-0/-root/e3b78cbc-cf4d-446a-b109-94c117c0efc4/scratchpad/04_range_detail.png' });

    // Check for price_category tags in rp-card-tags
    const tags = await page.$$eval('.rp-card-tags .tag', els => els.map(e => e.textContent.trim()));
    console.log('All tags in rp-card-tags:', JSON.stringify(tags));

    // Check all card bodies
    const cards = await page.$$eval('.rp-card-body', els => els.map(e => e.innerHTML.slice(0, 300)));
    console.log('First 3 card bodies:', JSON.stringify(cards.slice(0, 3)));
  }

  await browser.close();
})();
