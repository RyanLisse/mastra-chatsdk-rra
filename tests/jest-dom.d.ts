// tests/jest-dom.d.ts
import '@testing-library/jest-dom';

declare module 'bun:test' {
  interface Matchers<T = any> {
    toBeInTheDocument(): void;
    toHaveTextContent(text: string): void;
    toHaveAttribute(attr: string, value?: string): void;
    toHaveClass(className: string): void;
    toBeDisabled(): void;
    toBeEnabled(): void;
    toBeVisible(): void;
    toBeChecked(): void;
    toHaveFocus(): void;
    toHaveValue(value: string | number): void;
    toHaveDisplayValue(value: string): void;
    toBeRequired(): void;
    toBeInvalid(): void;
    toBeValid(): void;
  }
}
