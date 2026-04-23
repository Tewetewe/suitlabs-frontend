import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import HydrationSuppressor from '@/components/HydrationSuppressor';
import ApiStatusBanner from '@/components/ApiStatusBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SuitLabs - Suit Rental Management System',
  description: 'Professional suit rental management system',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SuitLabs',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.className} app-canvas`} suppressHydrationWarning>
        <HydrationSuppressor />
        <AuthProvider>
          <ToastProvider>
            <ApiStatusBanner />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}