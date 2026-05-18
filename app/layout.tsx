import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from '@/components/ThemeProvider';
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
import ChatBot from '@/components/ChatBot';
import './globals.css';

export const metadata: Metadata = {
  title: 'TradeLog Pro — The Professional Trading Journal',
  description:
    'Crypto, forex, and stocks. One disciplined journal. Pattern coaching that finds the leaks your eyes miss. Built for traders who treat this like a profession.',
  keywords: [
    'trading journal', 'crypto trading journal', 'forex journal',
    'trading coach', 'trading analytics',
    'TradeLog Pro', 'professional trading journal',
  ],
  openGraph: {
    title: 'TradeLog Pro — The Professional Trading Journal',
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
          <ChatBot />
        </ThemeProvider>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
        <Script
          defer
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "a60433f77895480680a4589ea6cb3885"}'
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
