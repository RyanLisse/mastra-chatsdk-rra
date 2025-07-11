'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';

import { register, type RegisterActionState } from '../actions';
import { toast } from '@/components/toast';
import { useSession } from 'next-auth/react';

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: 'idle',
    },
  );

  const { update: updateSession } = useSession();

  useEffect(() => {
    if (state.status === 'user_exists') {
      toast({ type: 'error', description: 'Account already exists!' });
      setIsSubmitting(false);
      setIsSuccessful(false);
    } else if (state.status === 'failed') {
      toast({ type: 'error', description: 'Failed to create account!' });
      setIsSubmitting(false);
      setIsSuccessful(false);
    } else if (state.status === 'invalid_data') {
      toast({
        type: 'error',
        description: 'Failed validating your submission!',
      });
      setIsSubmitting(false);
      setIsSuccessful(false);
    } else if (state.status === 'success') {
      if (!isSuccessful) {
        // Prevent duplicate toasts
        toast({
          type: 'success',
          description: 'Account created successfully!',
        });
        setIsSuccessful(true);
        setIsSubmitting(false);

        // Use a timeout to allow the toast to display before navigation
        const navigateTimeout = setTimeout(async () => {
          try {
            await updateSession();
            // Use direct navigation for more reliability in tests
            window.location.href = '/';
          } catch (error) {
            console.error('Navigation error:', error);
            // Fallback navigation
            window.location.href = '/';
          }
        }, 500);

        return () => clearTimeout(navigateTimeout);
      }
    }
  }, [state, updateSession, router, isSuccessful]);

  const handleSubmit = (formData: FormData) => {
    if (isSubmitting || isSuccessful) {
      return; // Prevent double submission
    }
    setIsSubmitting(true);
    setEmail(formData.get('email') as string);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl gap-12 flex flex-col">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign Up</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful || isSubmitting}>
            Sign Up
          </SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {'Already have an account? '}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign in
            </Link>
            {' instead.'}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
