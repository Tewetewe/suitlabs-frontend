import type { Metadata } from 'next';

// Customers open this page from WhatsApp, and WhatsApp shows this title in the
// link preview. The staff app title stays on the root layout.
export const metadata: Metadata = {
  title: 'Suitlabs Bali – Perjanjian Jaminan / Security Deposit Agreement',
  description: 'Suitlabs Bali security deposit agreement',
};

export default function AgreementLayout({ children }: { children: React.ReactNode }) {
  return children;
}
