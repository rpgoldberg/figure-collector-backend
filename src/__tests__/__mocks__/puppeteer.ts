// Comprehensive Puppeteer Mock Implementation

import { EventEmitter } from 'events';
import type { Browser, Page, BrowserConnectOptions, LaunchOptions } from 'puppeteer';

class MockPage implements Partial<Page> {
  private _emitter = new EventEmitter();

  content = jest.fn<Promise<string>, []>().mockResolvedValue('<html></html>');
  goto = jest.fn<Promise<null>, [string, any?]>().mockResolvedValue(null);
  $eval = jest.fn<Promise<any>, [string, (...args: any[]) => any]>().mockResolvedValue(null);
  $$eval = jest.fn<Promise<any[]>, [string, (...args: any[]) => any]>().mockResolvedValue([]);
  close = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

  on = jest.fn((event: string, callback: (...args: any[]) => void) => {
    this._emitter.on(event, callback);
    return this;
  });

  emit = jest.fn((event: string, ...args: any[]) => this._emitter.emit(event, ...args));

  // Additional required method stubs
  setDefaultNavigationTimeout = jest.fn<void, [number]>().mockReturnValue(undefined);
  setDefaultTimeout = jest.fn<void, [number]>().mockReturnValue(undefined);
}

class MockBrowser implements Partial<Browser> {
  newPage = jest.fn<Promise<Page>, []>().mockResolvedValue(new MockPage() as Page);
  close = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);

  // Additional required method stubs
  pages = jest.fn<Promise<Page[]>, []>().mockResolvedValue([new MockPage() as Page]);
}

const mockPuppeteer = {
  launch: jest.fn<Promise<Browser>, [LaunchOptions?]>().mockResolvedValue(new MockBrowser() as Browser),
  connect: jest.fn<Promise<Browser>, [BrowserConnectOptions?]>().mockResolvedValue(new MockBrowser() as Browser),
  Page: MockPage,
  Browser: MockBrowser,
};

export default mockPuppeteer;