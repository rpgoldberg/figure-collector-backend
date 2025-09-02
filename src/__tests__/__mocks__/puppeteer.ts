// Comprehensive Puppeteer Mock Implementation
import { EventEmitter } from 'events';

// Mock function type alias to fix TypeScript strict mode issues
type MockFn = any;

class MockPage {
  private _emitter = new EventEmitter();

  content: MockFn = jest.fn().mockResolvedValue('<html></html>') as any;
  goto: MockFn = jest.fn().mockResolvedValue(null) as any;
  $eval: MockFn = jest.fn().mockResolvedValue(null) as any;
  $$eval: MockFn = jest.fn().mockResolvedValue([]) as any;
  close: MockFn = jest.fn().mockResolvedValue(undefined) as any;

  on: MockFn = jest.fn((event: string, callback: (...args: any[]) => void) => {
    this._emitter.on(event, callback);
    return this;
  }) as any;

  emit: MockFn = jest.fn((event: string, ...args: any[]) => this._emitter.emit(event, ...args)) as any;

  // Additional required method stubs
  setDefaultNavigationTimeout: MockFn = jest.fn().mockReturnValue(undefined) as any;
  setDefaultTimeout: MockFn = jest.fn().mockReturnValue(undefined) as any;
}

class MockBrowser {
  newPage: MockFn = jest.fn().mockResolvedValue(new MockPage()) as any;
  close: MockFn = jest.fn().mockResolvedValue(undefined) as any;

  // Additional required method stubs
  pages: MockFn = jest.fn().mockResolvedValue([new MockPage()]) as any;
}

const mockPuppeteer = {
  launch: jest.fn().mockResolvedValue(new MockBrowser()) as any,
  connect: jest.fn().mockResolvedValue(new MockBrowser()) as any,
  Page: MockPage,
  Browser: MockBrowser,
};

export default mockPuppeteer;