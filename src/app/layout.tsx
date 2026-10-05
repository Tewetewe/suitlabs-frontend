import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { BranchProvider } from '@/contexts/BranchContext';
import { ToastProvider } from '@/contexts/ToastContext';
import HydrationSuppressor from '@/components/HydrationSuppressor';
import MobileGestureLock from '@/components/MobileGestureLock';
import KeyboardAvoid from '@/components/KeyboardAvoid';
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
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover' as const,
  themeColor: '#ffffff',
  /** Shrink the layout when the on-screen keyboard opens (Android/iOS). */
  interactiveWidget: 'resizes-content' as const,
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
        <MobileGestureLock />
        <KeyboardAvoid />
        <AuthProvider>
          <BranchProvider>
          <ToastProvider>
            <ApiStatusBanner />
            {children}
          </ToastProvider>
          </BranchProvider>
        </AuthProvider>
      </body>
    </html>
  );
}