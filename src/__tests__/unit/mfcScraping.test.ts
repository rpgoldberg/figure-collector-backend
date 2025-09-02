import puppeteer from 'puppeteer';
import { MOCK_FIGURE_HTML } from '../fixtures/test-html';

describe('MFC Specific Scraping Tests', () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  beforeEach(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();
  });

  it('extracts figure details from MFC-like HTML', async () => {
    await page.setContent(MOCK_FIGURE_HTML);

    const figureName = await page.$eval('.figure-name', el => el.textContent);
    const manufacturer = await page.$eval('.manufacturer', el => el.textContent);
    const releaseDate = await page.$eval('.release-date', el => el.textContent);
    const price = await page.$eval('.price', el => el.textContent);

    expect(figureName).toBe('Test Figure');
    expect(manufacturer).toBe('Test Manufacturer');
    expect(releaseDate).toBe('2023-01-01');
    expect(price).toBe('$99.99');
  });
});