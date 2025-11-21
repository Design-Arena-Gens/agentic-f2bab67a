import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dubai Tourism Video Generator',
  description: 'Generate a 30-second cinematic Dubai tourism video right in your browser.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
