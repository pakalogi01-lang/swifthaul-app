import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from '@/context/NotificationContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'BURAQFLEET',
  description: 'Connecting traders and drivers seamlessly.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <NotificationProvider>
          {children}
        </NotificationProvider>
        <Toaster />
      </body>
    </html>
  );
}
