'use client';

import { useFormStatus } from 'react-dom';

import { Loader2 } from 'lucide-react';

import { Button } from './ui/button';

export function SubmitButton({
  children,
  isSuccessful,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      aria-disabled={pending || isSuccessful}
      disabled={pending || isSuccessful}
      className="relative"
      data-testid="submit-button"
    >
      {children}

      {(pending || isSuccessful) && (
        <span
          className="animate-spin absolute right-4"
          data-testid="loading-spinner"
        >
          <Loader2 size={16} />
        </span>
      )}

      <output aria-live="polite" className="sr-only">
        {pending ? 'Loading...' : isSuccessful ? 'Success!' : 'Submit form'}
      </output>
    </Button>
  );
}
