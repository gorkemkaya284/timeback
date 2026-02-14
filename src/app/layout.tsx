import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

// Supabase auth + admin: static export/prerender disabled
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Timeback",
  description: "Earn rewards by completing offers and tasks.",
  icons: {
    icon: "/brand/favicon.svg",
    apple: "/brand/apple-touch-icon.svg",
  },
  openGraph: {
    title: "Timeback",
    description: "Earn rewards by completing offers and tasks.",
    images: [{ url: "/brand/og.svg", width: 1200, height: 630, alt: "Timeback" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/brand/og.svg"],
  },
};

// Inline script runs before paint to prevent theme flash (reads localStorage)
const themeScript = `
(function(){
  var t=localStorage.getItem('timeback-theme')||'system';
  var a=localStorage.getItem('timeback-accent')||'blue';
  var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches);
  document.documentElement.classList.add(dark?'dark':'light');
  document.documentElement.setAttribute('data-accent',a);
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
