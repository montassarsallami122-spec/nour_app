import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from './lib/i18n';

export const metadata: Metadata = {
  title: 'Chatbot RH — Mes données',
  description: 'Posez des questions en langage naturel sur vos employés et absences',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
