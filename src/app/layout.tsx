import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "ServesPlatform",
  description: "Gestión de Operaciones para Empresas de Servicios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className="antialiased bg-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
