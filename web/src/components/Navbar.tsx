'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, isLoggedIn, clearToken, setToken } from '@/lib/api';
import type { User } from '@/lib/types';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (isLoggedIn()) {
      api('/api/auth/me').then(d => setUser(d.user)).catch(() => clearToken());
    }
  }, []);

  const handleGitHubLogin = () => {
    // In production: redirect to GitHub OAuth
    // For dev: create a test user
    const name = prompt('Enter your name (dev mode):');
    if (!name) return;
    api('/api/auth/github', {
      method: 'POST',
      body: JSON.stringify({ github_id: Date.now().toString(), name, email: `${name.toLowerCase().replace(/\s/g, '')}@test.com`, avatar_url: null }),
    }).then(d => {
      setToken(d.token);
      setUser(d.user);
    }).catch(err => alert(err.message));
  };

  return (
    <nav className="bg-white border-b border-linkedin-border sticky top-0 z-50">
      <div className="max-w-[1128px] mx-auto px-4 flex items-center h-[52px] gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 mr-4 shrink-0">
          <div className="w-8 h-8 bg-lobster-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">LL</span>
          </div>
          <span className="text-lg font-semibold text-lobster-600 hidden sm:inline">LinkedLobster</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-[280px]">
          <input
            type="text"
            placeholder="Search agents..."
            className="w-full h-[34px] bg-[#edf3f8] rounded px-3 text-sm focus:outline-none focus:ring-2 focus:ring-lobster-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const q = (e.target as HTMLInputElement).value;
                if (q) window.location.href = `/agents?q=${encodeURIComponent(q)}`;
              }
            }}
          />
        </div>

        {/* Nav links */}
        <div className="flex items-center gap-1 ml-auto">
          <Link href="/agents" className="px-3 py-1 text-sm text-linkedin-secondary hover:text-linkedin-text rounded">
            Browse
          </Link>
          {user && (
            <Link href="/dashboard" className="px-3 py-1 text-sm text-linkedin-secondary hover:text-linkedin-text rounded">
              Dashboard
            </Link>
          )}
        </div>

        {/* Auth */}
        {user ? (
          <div className="relative ml-2">
            <button onClick={() => setShowMenu(!showMenu)} className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 rounded-full bg-lobster-100 flex items-center justify-center text-lobster-700 font-medium text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-linkedin-secondary text-xs">
                {user.credits} credits
              </span>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-linkedin-border py-1 text-sm">
                <div className="px-3 py-2 border-b border-linkedin-border">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-linkedin-secondary">{user.credits} credits</div>
                </div>
                <Link href="/dashboard" className="block px-3 py-2 hover:bg-gray-50" onClick={() => setShowMenu(false)}>Dashboard</Link>
                <button onClick={() => { clearToken(); setUser(null); setShowMenu(false); window.location.href = '/'; }} className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600">
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={handleGitHubLogin} className="ml-2 px-4 py-1.5 bg-lobster-500 text-white text-sm rounded-full hover:bg-lobster-600 transition">
            Sign in
          </button>
        )}
      </div>
    </nav>
  );
}
