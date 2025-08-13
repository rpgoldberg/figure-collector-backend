import puppeteer from 'puppeteer';

describe('Browser Pool Management', () => {
  const POOL_SIZE = 3;
  let browsers: puppeteer.Browser[] = [];

  beforeEach(async () => {
    browsers = await Promise.all(
      Array.from({ length: POOL_SIZE }, () => puppeteer.launch())
    );
  });

  afterEach(async () => {
    await Promise.all(browsers.map(browser => browser.close()));
  });

  it('creates multiple browser instances', () => {
    expect(browsers.length).toBe(POOL_SIZE);
  });

  it('can create pages on different browser instances', async () => {
    const pages = await Promise.all(
      browsers.map(browser => browser.newPage())
    );

    expect(pages.length).toBe(POOL_SIZE);
    pages.forEach(page => expect(page).toBeTruthy());
  });

  it('manages browser resource allocation', async () => {
    const resourcePromises = browsers.map(async (browser) => {
      const page = await browser.newPage();
      await page.goto('about:blank');
      return page;
    });

    const pages = await Promise.all(resourcePromises);
    expect(pages.length).toBe(POOL_SIZE);
  });
});