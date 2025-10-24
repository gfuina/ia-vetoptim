'use client';

import { useState, useEffect } from 'react';
import { TextInput, Button, Loader } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import Image from 'next/image';

interface LoginGuardProps {
  children: React.ReactNode;
}

export default function LoginGuard({ children }: LoginGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Vérifier si déjà authentifié
    const auth = sessionStorage.getItem('authenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('authenticated', 'true');
        setIsAuthenticated(true);
      } else {
        setError(data.message || 'Mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }

    setLoading(false);
  };

  if (checking) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(to bottom right, #001489, #171A47, #9652FF)',
        }}
      >
        <Loader size="lg" color="white" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom right, #001489, #171A47, #9652FF)',
        }}
      >
        {/* Liquid background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-3xl animate-pulse"
            style={{
              background: 'rgba(79, 199, 186, 0.1)',
            }}
          ></div>
          <div
            className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full blur-3xl animate-pulse"
            style={{
              background: 'rgba(84, 148, 255, 0.1)',
              animationDelay: '1s',
            }}
          ></div>
        </div>

        <div className="relative z-10 w-full max-w-md p-8">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <Image
                src="/VETOPTIM_LOGO_2025_Blanc.svg"
                alt="VetOptim Logo"
                width={200}
                height={60}
                priority
              />
            </div>

            <h1 className="text-2xl font-bold text-white text-center mb-6">
              Accès sécurisé
            </h1>

            <form onSubmit={handleLogin} className="space-y-4">
              <TextInput
                placeholder="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                size="lg"
                leftSection={<IconLock size={18} />}
                styles={{
                  input: {
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    '&::placeholder': {
                      color: 'rgba(255, 255, 255, 0.4)',
                    },
                  },
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin(e);
                  }
                }}
              />

              {error && (
                <div
                  className="rounded-lg p-3 text-sm font-medium"
                  style={{
                    background: 'rgba(232, 107, 99, 0.2)',
                    border: '1px solid rgba(232, 107, 99, 0.3)',
                    color: '#E86B63',
                  }}
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                size="lg"
                disabled={loading || !password}
                style={{
                  background: password ? '#4FC7BA' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                }}
              >
                {loading ? <Loader size="sm" color="white" /> : 'Se connecter'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

