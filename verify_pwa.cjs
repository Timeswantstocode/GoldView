const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport to mobile
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto('http://localhost:5173');

  // Click hamburger menu
  await page.click('button[aria-label="Menu"]');

  // Wait for menu to open
  await page.waitForTimeout(500);

  // Take screenshot of hamburger menu
  await page.screenshot({ path: '/home/jules/verification/hamburger_menu.png' });

  // Check for "Add to home screen" text
  const text = await page.textContent('body');
  console.log('Contains Add to home screen:', text.includes('Add the app to home screen for better experience'));

  // Click "How?" button if it exists
  const howButton = await page.$('button:has-text("How?")');
  if (howButton) {
    await howButton.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/home/jules/verification/install_guide.png' });
  } else {
    console.log('How? button not found');
  }

  await browser.close();
})();
