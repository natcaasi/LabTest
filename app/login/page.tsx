'use client';

import { useState } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const optionsRes = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(options.error || 'Registration failed');
        setLoading(false);
        return;
      }

      const credential = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), credential }),
      });

      if (verifyRes.ok) {
        window.location.href = '/';
      } else {
        const data = await verifyRes.json();
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
    setLoading(false);
  }

  async function handleLogin() {
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const optionsRes = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      const options = await optionsRes.json();
      if (!optionsRes.ok) {
        setError(options.error || 'Login failed');
        setLoading(false);
        return;
      }

      const credential = await startAuthentication({ optionsJSON: options });

      const verifyRes = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), credential }),
      });

      if (verifyRes.ok) {
        window.location.href = '/';
      } else {
        const data = await verifyRes.json();
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2 text-center text-gray-900 dark:text-white">Todo App</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-6">Sign in with your passkey</p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <input
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="Enter username"
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          onKeyDown={e => {
            if (e.key === 'Enter') handleLogin();
          }}
          disabled={loading}
        />

        <div className="flex gap-3">
          <button
            onClick={handleRegister}
            disabled={loading}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? '...' : 'Register'}
          </button>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? '...' : 'Login'}
          </button>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 text-center">
          Uses WebAuthn/Passkeys for secure passwordless authentication
        </p>
      </div>
    </div>
  );
}
