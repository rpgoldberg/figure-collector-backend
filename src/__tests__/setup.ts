// Jest Setup Configuration

import 'jest-extended';

// Global test configuration and mocks
jest.mock('puppeteer', () => require('./__mocks__/puppeteer').default);

// Optional: Add global before/after hooks
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Optional cleanup
  jest.resetAllMocks();
});