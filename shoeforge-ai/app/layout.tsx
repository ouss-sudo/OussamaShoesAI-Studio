import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OussamaShoes AI — Customisation 3D de Chaussures",
  description: "Personnalisez vos chaussures en 3D avec l'aide de l'intelligence artificielle. Couleurs, textures, motifs générés par IA.",
  keywords: "chaussures, customisation, 3D, IA, intelligence artificielle, design",
  themeColor: "#05060a",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

