// tests/setup-dom.ts
import '@testing-library/jest-dom';
import './jest-dom';
import React from 'react';

// Setup for React Testing Library with Bun
global.ResizeObserver =
  global.ResizeObserver ||
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

// Mock Next.js router
const useRouter = () => ({
  route: '/',
  pathname: '/',
  query: {},
  asPath: '/',
  push: () => Promise.resolve(true),
  replace: () => Promise.resolve(true),
  reload: () => {},
  back: () => {},
  prefetch: () => Promise.resolve(),
  beforePopState: () => {},
  events: {
    on: () => {},
    off: () => {},
    emit: () => {},
  },
});

// Mock Next.js components
const Image = (props: any) => React.createElement('img', props);
const Link = ({ children, href, ...props }: any) =>
  React.createElement('a', { href, ...props }, children);

// Export mocks for use in tests
export { useRouter, Image, Link };
