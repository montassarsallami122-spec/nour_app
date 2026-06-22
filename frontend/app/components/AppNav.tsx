'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useI18n, LangToggle } from '../lib/i18n';

// Barre de navigation des pages privées.
//  - « Comptes » : admin uniquement (création de comptes).
//  - « Espace RH » : admin + rh (alertes & messages de contact).
export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [out, setOut] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setRole(d.role))
      .catch(() => {});
  }, []);

  async function logout() {
    setOut(true);
    try {
      await fetch('/api/logout', { method: 'POST' });
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  const is = (p: string) => pathname === p;
  const isStaff = role === 'admin' || role === 'rh';

  return (
    <nav className="nav">
      <Link href="/chatbot" className={`nav-link ${is('/chatbot') ? 'active' : ''}`}>{t('nav.chatbot')}</Link>
      <Link href="/dashboard" className={`nav-link ${is('/dashboard') ? 'active' : ''}`}>{t('nav.dashboard')}</Link>
      {isStaff && (
        <Link href="/notifications" className={`nav-link ${is('/notifications') ? 'active' : ''}`}>{t('nav.rh')}</Link>
      )}
      {role === 'admin' && (
        <Link href="/admin" className={`nav-link ${is('/admin') ? 'active' : ''}`}>{t('nav.accounts')}</Link>
      )}
      <button className="nav-link nav-logout" onClick={logout} disabled={out}>
        {out ? '…' : t('nav.logout')}
      </button>
      <LangToggle />
    </nav>
  );
}
