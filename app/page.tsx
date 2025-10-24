'use client';

import { useEffect, useState } from 'react';
import { Loader } from '@mantine/core';
import Image from 'next/image';

interface ConnectionStatus {
  success: boolean;
  message: string;
  data?: any;
}

export default function Home() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/test-connection')
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch((error) => {
        setStatus({
          success: false,
          message: error.message,
        });
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: 'linear-gradient(to bottom right, #001489, #171A47, #9652FF)'
    }}>
      {/* Liquid background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full blur-3xl animate-pulse" style={{
          background: 'rgba(79, 199, 186, 0.1)'
        }}></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full blur-3xl animate-pulse" style={{
          background: 'rgba(84, 148, 255, 0.1)',
          animationDelay: '1s'
        }}></div>
      </div>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <div className="mb-12 flex justify-center">
            <Image
              src="/VETOPTIM_LOGO_2025_Blanc.svg"
              alt="VetOptim Logo"
              width={300}
              height={80}
              priority
            />
          </div>

          {/* Connection Status Card */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl">
            <h1 className="text-3xl font-bold text-white mb-6 text-center">
              Base de Données IA
            </h1>

            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
                <span className="text-white/80 font-medium">Serveur</span>
                <span className="text-white font-mono text-sm">
                  v2devsqlserver.database.windows.net
                </span>
              </div>

              <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
                <span className="text-white/80 font-medium">Base</span>
                <span className="text-white font-mono text-sm">v2dev</span>
              </div>

              <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
                <span className="text-white/80 font-medium">Statut</span>
                <div className="flex items-center gap-3">
                  {loading ? (
                    <>
                      <Loader size="sm" color="white" />
                      <span className="text-white/60">Connexion...</span>
                    </>
                  ) : status?.success ? (
                    <>
                      <div className="w-3 h-3 bg-accent-teal rounded-full animate-pulse shadow-lg shadow-accent-teal/50"></div>
                      <span className="text-accent-teal font-semibold">
                        Connecté
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-3 h-3 bg-accent-coral rounded-full animate-pulse shadow-lg shadow-accent-coral/50"></div>
                      <span className="text-accent-coral font-semibold">
                        Erreur
                      </span>
                    </>
                  )}
                </div>
              </div>

              {status && !loading && (
                <div
                  className="mt-6 rounded-xl p-4 border"
                  style={{
                    backgroundColor: status.success ? 'rgba(79, 199, 186, 0.1)' : 'rgba(232, 107, 99, 0.1)',
                    borderColor: status.success ? 'rgba(79, 199, 186, 0.3)' : 'rgba(232, 107, 99, 0.3)'
                  }}
                >
                  <p
                    className="text-sm font-semibold"
                    style={{
                      color: status.success ? '#4FC7BA' : '#E86B63'
                    }}
                  >
                    {status.message}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-white/60 text-sm">
              Prêt pour les requêtes IA
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
