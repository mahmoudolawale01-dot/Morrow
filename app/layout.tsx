import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Morrow',
  description: 'Morrow storefront and API foundation migrated to Next.js + Supabase',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
