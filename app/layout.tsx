import type {Metadata} from 'next';
import { Orbitron, Rajdhani, Space_Grotesk, Geist } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
});

const rajdhani = Rajdhani({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-rajdhani',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Dark Empire HQ',
  description: 'Official Headquarters of Dark Empire Holdings. DEMP Token Verification, Products, and Services.',
  openGraph: {
    title: 'Dark Empire HQ',
    description: 'Official Headquarters of Dark Empire Holdings. DEMP Token Verification, Products, and Services.',
    type: 'website',
    images: ['/attached_assets/hero_bg.png'],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@replit',
    title: 'Dark Empire HQ',
    description: 'Official Headquarters of Dark Empire Holdings. DEMP Token Verification, Products, and Services.',
    images: ['/attached_assets/hero_bg.png'],
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("dark", orbitron.variable, rajdhani.variable, spaceGrotesk.variable, "font-sans", geist.variable)}>
      <body className="bg-background text-foreground font-sans antialiased" suppressHydrationWarning>
        <Providers>
          <div className="min-h-screen flex flex-col relative w-full">
            <Navbar />
            <main className="flex-1 w-full pt-20">
              {children}
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
