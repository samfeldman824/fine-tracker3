"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/features/auth';
import { useAuth } from '@/contexts/auth-context';

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If user is already authenticated, redirect to home page
    if (!loading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, loading, router]);

  // Don't render login form if user is already authenticated
  if (loading || isAuthenticated) {
    return null;
  }

  return <LoginForm />;
}
