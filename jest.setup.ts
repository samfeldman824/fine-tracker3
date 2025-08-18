import '@testing-library/jest-dom';

// Prevent long HTML dumps on test failures
process.env.DEBUG_PRINT_LIMIT = '0';

// Mock window.alert
Object.defineProperty(window, 'alert', {
  writable: true,
  value: jest.fn(),
});

// Mock console.error to reduce noise in tests
const originalConsoleError = console.error;

beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});
