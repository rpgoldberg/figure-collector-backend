import puppeteer from 'puppeteer';
import { performance } from 'perf_hooks';

describe('Puppeteer Performance Tests', () => {
  let browser: puppeteer.Browser;

  beforeAll(async () => {
    browser = await puppeteer.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('measures page creation performance', async () => {
    const startTime = performance.now();
    const page = await browser.newPage();
    const endTime = performance.now();

    await page.close();

    const creationTime = endTime - startTime;
    expect(creationTime).toBeLessThan(500); // Page creation under 500ms
  });

  it('benchmarks navigation time', async () => {
    const page = await browser.newPage();
    
    const startTime = performance.now();
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
    const endTime = performance.now();

    await page.close();

    const navigationTime = endTime - startTime;
    expect(navigationTime).toBeLessThan(1000); // Navigation under 1 second
  });
});