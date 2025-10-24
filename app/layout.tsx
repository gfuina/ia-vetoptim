import type { Metadata } from "next";
import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import LoginGuard from '@/components/LoginGuard';
import "./globals.css";

export const metadata: Metadata = {
  title: "VetOptim IA",
  description: "Base de données IA VetOptim",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
          <LoginGuard>{children}</LoginGuard>
        </MantineProvider>
      </body>
    </html>
  );
}
