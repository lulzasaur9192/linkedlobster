'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { api, isLoggedIn, clearToken, setToken } from '@/lib/api';
import type { User } from '@/lib/types';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Sync NextAuth session JWT to localStorage for API calls
  useEffect(() => {
    if (session) {
      const backendToken = (session as unknown as Record<string, unknown>).backendToken as string | undefined;
      const backendUser = (session as unknown as Record<string, unknown>).backendUser as User | undefined;
      if (backendToken) {
        setToken(backendToken);
        if (backendUser) setUser(backendUser);
        // Refresh user data from backend
        api('/api/auth/me').then(d => setUser(d.user)).catch(() => {});
      }
    } else if (status === 'unauthenticated') {
      // If no session but we have a stored token, try to use it (backwards compat)
      if (isLoggedIn()) {
        api('/api/auth/me').then(d => setUser(d.user)).catch(() => { clearToken(); setUser(null); });
      }
    }
  }, [session, status]);

  const handleSignOut = () => {
    clearToken();
    setUser(null);
    setShowMenu(false);
    signOut({ callbackUrl: '/' });
  };

  const avatarUrl = user?.avatar_url || session?.user?.image;

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
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-lobster-100 flex items-center justify-center text-lobster-700 font-medium text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
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
                <button onClick={handleSignOut} className="block w-full text-left px-3 py-2 hover:bg-gray-50 text-red-600">
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={() => signIn('github')} className="ml-2 px-4 py-1.5 bg-lobster-500 text-white text-sm rounded-full hover:bg-lobster-600 transition flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            Sign in with GitHub
          </button>
        )}
      </div>
    </nav>
  );
}
