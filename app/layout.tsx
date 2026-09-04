import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./styles/main.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SHUX — Shan Gray",
  description:
    "Personal portfolio by Shan Gray. Interaction design and front-end craft — experiences that feel native on every screen.",
  metadataBase: new URL("https://shux.dev"),
  manifest: "/manifest.json",
  openGraph: {
    title: "SHUX — Shan Gray",
    description:
      "Interaction design and front-end craft. Clean, accessible, app-like web experiences.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`site-root ${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="site-body">
        {/*
          No theme bootstrap script here on purpose. Every <script> inside the
          React tree — raw or via next/script's beforeInteractive — gets
          re-rendered on the client, where scripts never execute, which is the
          console warning. The first-paint theme is resolved in CSS from
          `prefers-color-scheme` instead (see app/styles/_theme.less), and
          ThemeProvider writes `data-theme` only as an explicit override.
        */}
        <a href="#about" className="skip-link">
          Skip to content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
