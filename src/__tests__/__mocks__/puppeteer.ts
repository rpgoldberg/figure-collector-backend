// Comprehensive Puppeteer Mock Implementation

import { EventEmitter } from 'events';

class MockPage {
  private _emitter = new EventEmitter();
  content = jest.fn().mockResolvedValue('<html></html>');
  goto = jest.fn().mockResolvedValue(null);
  $eval = jest.fn().mockResolvedValue(null);
  $$eval = jest.fn().mockResolvedValue([]);
  close = jest.fn().mockResolvedValue(null);
  on = jest.fn((event, callback) => this._emitter.on(event, callback));
  emit = jest.fn((event, ...args) => this._emitter.emit(event, ...args));
}

class MockBrowser {
  newPage = jest.fn().mockResolvedValue(new MockPage());
  close = jest.fn().mockResolvedValue(null);
}

const mockPuppeteer = {
  launch: jest.fn().mockResolvedValue(new MockBrowser()),
  connect: jest.fn().mockResolvedValue(new MockBrowser()),
  Page: MockPage,
  Browser: MockBrowser,
};

export default mockPuppeteer;