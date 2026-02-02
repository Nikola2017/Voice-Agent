'use client';

import { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import {
  isMasterPasswordSet,
  setMasterPassword,
  verifyMasterPassword,
  createSession,
  isSessionValid,
} from '@/lib/encryption';

interface MasterPasswordScreenProps {
  onUnlock: () => void;
}

export function MasterPasswordScreen({ onUnlock }: MasterPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already unlocked in this session
    if (isSessionValid()) {
      onUnlock();
      return;
    }

    // Check if master password is set
    const hasPassword = isMasterPasswordSet();
    setIsSetup(!hasPassword);
    setIsLoading(false);
  }, [onUnlock]);

  const handleSetup = async () => {
    setError('');

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen haben');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }

    try {
      await setMasterPassword(password);
      createSession();
      onUnlock();
    } catch (err) {
      setError('Fehler beim Speichern des Passworts');
    }
  };

  const handleUnlock = async () => {
    setError('');

    if (!password) {
      setError('Bitte Passwort eingeben');
      return;
    }

    try {
      const isValid = await verifyMasterPassword(password);
      if (isValid) {
        createSession();
        onUnlock();
      } else {
        setError('Falsches Passwort');
        setPassword('');
      }
    } catch (err) {
      setError('Fehler bei der Überprüfung');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isSetup) {
        handleSetup();
      } else {
        handleUnlock();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0a19] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0a19] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">VelaMind</h1>
          <p className="text-zinc-500 text-sm mt-1">Sichere Sprachnotizen</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1325] rounded-2xl p-6 border border-purple-500/20 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {isSetup ? 'Master-Passwort erstellen' : 'App entsperren'}
              </h2>
              <p className="text-xs text-zinc-500">
                {isSetup
                  ? 'Schütze deine Daten mit einem Passwort'
                  : 'Gib dein Master-Passwort ein'}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Password Input */}
          <div className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Master-Passwort"
                className="w-full px-4 py-3 pr-12 rounded-lg bg-[#241b2f] border border-purple-500/20 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Confirm Password (Setup only) */}
            {isSetup && (
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Passwort bestätigen"
                  className="w-full px-4 py-3 rounded-lg bg-[#241b2f] border border-purple-500/20 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={isSetup ? handleSetup : handleUnlock}
              className="w-full py-3 rounded-lg bg-purple-500 hover:bg-purple-400 text-white font-medium transition flex items-center justify-center gap-2"
            >
              {isSetup ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Passwort speichern
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Entsperren
                </>
              )}
            </button>
          </div>

          {/* Security Info */}
          <div className="mt-6 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <p className="text-xs text-purple-300">
              🔒 <strong>Sicherheitshinweis:</strong> Dein Passwort wird nie im Klartext gespeichert.
              Alle Daten werden verschlüsselt. Nach 30 Minuten Inaktivität wirst du automatisch ausgeloggt.
            </p>
          </div>

          {/* Password Requirements (Setup only) */}
          {isSetup && (
            <div className="mt-4 text-xs text-zinc-500">
              <p className="mb-2">Passwort-Anforderungen:</p>
              <ul className="space-y-1">
                <li className={password.length >= 6 ? 'text-green-400' : ''}>
                  {password.length >= 6 ? '✓' : '○'} Mindestens 6 Zeichen
                </li>
                <li className={password === confirmPassword && confirmPassword.length > 0 ? 'text-green-400' : ''}>
                  {password === confirmPassword && confirmPassword.length > 0 ? '✓' : '○'} Passwörter stimmen überein
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          Deine Daten bleiben lokal auf deinem Gerät
        </p>
      </div>
    </div>
  );
}
