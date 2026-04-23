'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.push(isAuthenticated ? '/dashboard' : '/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="min-h-screen app-canvas flex flex-col items-center justify-center gap-4">
      <div className="glass-panel-strong rounded-3xl px-6 py-5">
        <Image
          src="/suitlabs-logo.svg"
          alt="SuitLabs"
          width={240}
          height={64}
          priority
          className="h-8 w-auto"
        />
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}