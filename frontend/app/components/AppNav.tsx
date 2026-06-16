'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

// Barre de navigation des pages privées (chatbot + dashboard) avec déconnexion.
export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [out, setOut] = useState(false);

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

  return (
    <nav className="nav">
      <Link href="/chatbot" className={`nav-link ${is('/chatbot') ? 'active' : ''}`}>💬 Chatbot</Link>
      <Link href="/dashboard" className={`nav-link ${is('/dashboard') ? 'active' : ''}`}>📊 Dashboard</Link>
      <button className="nav-link nav-logout" onClick={logout} disabled={out}>
        {out ? '…' : '⏻ Déconnexion'}
      </button>
    </nav>
  );
}
