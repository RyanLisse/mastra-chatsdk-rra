// Type definitions for bun:test
declare module 'bun:test' {
  export function describe(name: string, fn: () => void): void;
  export function test(
    name: string,
    fn: () => void | Promise<void>,
    timeout?: number,
  ): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function expect(value: any): {
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toContain(expected: any): void;
    toContainEqual(expected: any): void;
    toHaveLength(expected: number): void;
    toMatch(expected: RegExp | string): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toBeInstanceOf(expected: any): void;
    toThrow(expected?: string | RegExp | Error): void;
    rejects: {
      toBe(expected: any): Promise<void>;
      toEqual(expected: any): Promise<void>;
      toThrow(expected?: string | RegExp | Error): Promise<void>;
      toBeInstanceOf(expected: any): Promise<void>;
    };
    resolves: {
      toBe(expected: any): Promise<void>;
      toEqual(expected: any): Promise<void>;
      toBeDefined(): Promise<void>;
      toBeInstanceOf(expected: any): Promise<void>;
    };
    not: {
      toBe(expected: any): void;
      toEqual(expected: any): void;
      toBeDefined(): void;
      toBeUndefined(): void;
      toBeNull(): void;
      toBeTruthy(): void;
      toBeFalsy(): void;
      toContain(expected: any): void;
      toContainEqual(expected: any): void;
      toHaveLength(expected: number): void;
      toMatch(expected: RegExp | string): void;
      toBeGreaterThan(expected: number): void;
      toBeGreaterThanOrEqual(expected: number): void;
      toBeLessThan(expected: number): void;
      toBeLessThanOrEqual(expected: number): void;
      toBeInstanceOf(expected: any): void;
      toThrow(expected?: string | RegExp | Error): void;
    };
  };
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
}

// Global Bun object
declare global {
  const Bun: {
    env: Record<string, string | undefined>;
    file(path: string): {
      exists(): Promise<boolean>;
      text(): Promise<string>;
      size: number;
      type: string;
    };
    // Add other Bun properties as needed
  };
}
