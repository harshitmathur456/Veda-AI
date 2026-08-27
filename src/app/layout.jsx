import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'VedaAI — AI Assessment Extraction & Answer Mapping',
  description: 'Automated question paper extraction, handwritten answer sheet mapping, visual bounding-box highlighting, and AI teacher feedback.',
  keywords: ['AI Assessment', 'VedaAI', 'Answer Sheet Mapping', 'Handwriting OCR', 'EdTech AI'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.className} bg-slate-100 text-slate-900 antialiased selection:bg-brand-500 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
