import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QRSplit - Pagos Grupales Blockchain | Starknet",
  description: "Divide cuentas y garantiza pagos on-chain. Escanea QR, agrega items y ejecuta pagos atómicos con smart contracts en Starknet.",
  keywords: "QRSplit, pagos grupales, blockchain, Starknet, smart contracts, QR code, split bills, crypto payments",
  authors: [{ name: "QRSplit Team" }],
  openGraph: {
    title: "QRSplit - Pagos Grupales Blockchain",
    description: "La única app de pagos grupales con garantía blockchain. Todos pagan o nadie paga.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}