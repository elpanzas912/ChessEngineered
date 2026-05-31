// src/app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/tokens.css';
import '@/styles/style.css';
import { AppProvider } from '@/context/AppContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'ChessEngineered — Repertoire',
    description: 'Master the chess openings with interactive move-by-move training.',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <AppProvider>
                    <Navbar />
                    {children}
                    <Footer />
                </AppProvider>
            </body>
        </html>
    );
}
