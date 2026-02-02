'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { AuthScreen, Dashboard } from '@/components';

export default function Home() {
  const { isAuthenticated } = useAppStore();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0f0a15] flex items-center justify-center">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-xl">V</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <Dashboard />;
}
