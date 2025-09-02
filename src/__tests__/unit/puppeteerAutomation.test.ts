import puppeteer from 'puppeteer';

describe('Puppeteer Automation Capabilities', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeEach(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();
  });

  it('handles JavaScript-enabled page interactions', async () => {
    await page.goto('about:blank');
    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="test-element">Test Content</div>
        <button onclick="document.getElementById('test-element').textContent = 'Updated'">Click Me</button>
      `;
    });

    const initialContent = await page.$eval('#test-element', el => el.textContent);
    expect(initialContent).toBe('Test Content');

    await page.click('button');

    const updatedContent = await page.$eval('#test-element', el => el.textContent);
    expect(updatedContent).toBe('Updated');
  });

  it('supports custom user agent settings', async () => {
    const customUserAgent = 'Mozilla/5.0 (Custom Browser)';
    await page.setUserAgent(customUserAgent);

    const userAgent = await page.evaluate(() => navigator.userAgent);
    expect(userAgent).toBe(customUserAgent);
  });
});