import puppeteer from 'puppeteer';
import { MOCK_FIGURE_HTML } from '../fixtures/test-html';

describe('Generic Web Scraper', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeEach(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();
  });

  it('should navigate and extract content', async () => {
    await page.goto('https://example.com');
    await page.setContent(MOCK_FIGURE_HTML);

    const figureName = await page.$eval('.figure-name', el => el.textContent);
    const manufacturer = await page.$eval('.manufacturer', el => el.textContent);

    expect(figureName).toBe('Test Figure');
    expect(manufacturer).toBe('Test Manufacturer');
  });

  it('handles empty page scenarios', async () => {
    await page.goto('https://example.com');
    await page.setContent('');

    const elements = await page.$$('.figure-container');
    expect(elements.length).toBe(0);
  });
});