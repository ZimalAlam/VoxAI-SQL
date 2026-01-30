// app/layout.tsx
import './globals.css'; // Ensure you have global styles imported
import { Inter, Sora } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter'
});

const sora = Sora({ 
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sora'
});

export const metadata = {
  title: 'VoxAi SQL',
  description: 'A platform for voice-to-SQL translation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sora.variable}`}>
        {children} {/* Render the child components here */}
      </body>
    </html>
  );
}
