import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import HydrationSuppressor from '@/components/HydrationSuppressor';

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
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`} suppressHydrationWarning>
        <HydrationSuppressor />
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}