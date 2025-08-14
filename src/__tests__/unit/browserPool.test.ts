import puppeteer from 'puppeteer';

// Mock-specific type extension
type MockBrowser = puppeteer.Browser & {
  _isTestMock?: boolean;
};

describe('Browser Pool Management', () => {
  const POOL_SIZE = 3;
  let browsers: MockBrowser[] = [];

  beforeEach(async () => {
    browsers = await Promise.all(
      Array.from({ length: POOL_SIZE }, async () => {
        const browser = await puppeteer.launch() as MockBrowser;
        browser._isTestMock = true;
        return browser;
      })
    );
  });

  afterEach(async () => {
    await Promise.all(browsers.map(browser => browser.close()));
  });

  it('creates multiple browser instances', () => {
    expect(browsers.length).toBe(POOL_SIZE);
    browsers.forEach(browser => {
      expect(browser._isTestMock).toBe(true);
    });
  });

  it('can create pages on different browser instances', async () => {
    const pages = await Promise.all(
      browsers.map(browser => browser.newPage())
    );

    expect(pages.length).toBe(POOL_SIZE);
    pages.forEach(page => {
      expect(page).toBeTruthy();
      expect(page.goto).toBeDefined();
    });
  });

  it('manages browser resource allocation', async () => {
    const resourcePromises = browsers.map(async (browser) => {
      const page = await browser.newPage();
      await page.goto('about:blank');
      return page;
    });

    const pages = await Promise.all(resourcePromises);
    expect(pages.length).toBe(POOL_SIZE);
    pages.forEach(page => {
      expect(page.close).toBeDefined();
    });
  });
});