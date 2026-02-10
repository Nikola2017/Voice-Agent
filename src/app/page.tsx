'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { AuthScreen, Dashboard } from '@/components';
import { MasterPasswordScreen } from '@/components/MasterPasswordScreen';
import { isSessionValid, clearSession, startActivityTracker, stopActivityTracker } from '@/lib/encryption';

export default function Home() {
  const { isAuthenticated, logout } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Handle session timeout
  const handleSessionTimeout = useCallback(() => {
    setIsUnlocked(false);
    logout();
    alert('Sitzung abgelaufen. Bitte erneut anmelden.');
  }, [logout]);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);

    // Check if already unlocked in this session
    if (isSessionValid()) {
      setIsUnlocked(true);
    }
  }, []);

  // Start activity tracker when unlocked
  useEffect(() => {
    if (isUnlocked) {
      startActivityTracker(handleSessionTimeout);
    }

    return () => {
      stopActivityTracker();
    };
  }, [isUnlocked, handleSessionTimeout]);

  // Handle unlock
  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  // Handle manual lock
  const handleLock = () => {
    clearSession();
    setIsUnlocked(false);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#0f0a15] flex items-center justify-center">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-xl">V</span>
        </div>
      </div>
    );
  }

  // Show master password screen if not unlocked
  if (!isUnlocked) {
    return <MasterPasswordScreen onUnlock={handleUnlock} />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return <Dashboard />;
}
