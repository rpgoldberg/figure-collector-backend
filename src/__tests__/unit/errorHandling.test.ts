import puppeteer from 'puppeteer';
import { ERROR_HTML } from '../fixtures/test-html';

describe('Error Handling in Web Scraping', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeEach(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();
  });

  it('handles network errors gracefully', async () => {
    // Simulate network error
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      request.abort();
    });

    await expect(page.goto('https://nonexistent-site.com')).rejects.toThrow();
  });

  it('manages page load errors', async () => {
    await page.setContent(ERROR_HTML);
    const errorElements = await page.$$('.error-page');
    
    expect(errorElements.length).toBeGreaterThan(0);
  });

  it('timeout handling works correctly', async () => {
    await expect(page.goto('https://example.com', { timeout: 1 })).rejects.toThrow('Navigation timeout');
  });
});