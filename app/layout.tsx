import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from '@/components/ThemeProvider';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

export const metadata: Metadata = {
  title: 'TradeLog Pro — The AI Trading Journal for Serious Traders',
  description:
    'Crypto, forex, and stocks. One disciplined journal. AI coaching that finds the patterns your eyes miss. Built for traders who treat this like a profession.',
  keywords: [
    'trading journal', 'crypto trading journal', 'forex journal',
    'AI trading coach', 'FTMO journal', 'prop firm journal',
    'TradeLog Pro', 'trading analytics',
  ],
  openGraph: {
    title: 'TradeLog Pro — The AI Trading Journal',
    description: 'Know why you win. Know why you lose. Trade like a professional.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('theme')==='light')document.documentElement.classList.add('light')}catch(e){}` }} />
      </head>
      <body className="bg-bg text-text font-sans antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
