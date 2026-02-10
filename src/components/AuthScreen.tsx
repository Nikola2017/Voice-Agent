'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';

export function AuthScreen() {
  const { login, register } = useAppStore();
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignIn) {
      const success = login(email, password);
      if (!success) {
        setError('E-Mail oder Passwort falsch');
      }
    } else {
      if (!name.trim()) {
        setError('Bitte Name eingeben');
        return;
      }
      const success = register(email, password, name);
      if (!success) {
        setError('E-Mail bereits registriert');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f0a15] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1a1325] rounded-2xl p-8 border border-purple-500/10">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
              <span className="text-white font-bold text-3xl">V</span>
            </div>
            <h1 className="text-2xl font-bold text-white">VelaMind</h1>
            <p className="text-zinc-500 text-sm">Voice Intelligence</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsSignIn(true)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                isSignIn 
                  ? 'bg-purple-500/20 text-white' 
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignIn(false)}
              className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                !isSignIn 
                  ? 'bg-purple-500/20 text-white' 
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isSignIn && (
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              className="w-full"
            />

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full">
              {isSignIn ? 'Sign In' : 'Sign Up'}
            </button>
          </form>

          {/* Demo hint */}
          <p className="text-center text-xs text-zinc-600 mt-6">
            Demo: Registriere dich mit beliebigen Daten
          </p>
        </div>
      </div>
    </div>
  );
}
