'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const optionsResponse = await fetch('/api/auth/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!optionsResponse.ok) throw new Error('Failed to get registration options');
      const options = await optionsResponse.json();

      const attResp = await startRegistration(options);

      const verifyResponse = await fetch('/api/auth/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, attestationResponse: attResp }),
      });

      if (!verifyResponse.ok) throw new Error('Registration failed');

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const optionsResponse = await fetch('/api/auth/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (!optionsResponse.ok) throw new Error('Failed to get login options');
      const options = await optionsResponse.json();

      const assertionResp = await startAuthentication(options);

      const verifyResponse = await fetch('/api/auth/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, assertionResponse: assertionResp }),
      });

      if (!verifyResponse.ok) throw new Error('Login failed');

      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          Todo App
        </h1>

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              disabled={loading}
            />
          </div>

          {error && <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegistering ? 'Register' : 'Login'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            {isRegistering ? 'Already have an account? Login' : 'No account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
