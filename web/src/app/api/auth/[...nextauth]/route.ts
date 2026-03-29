import NextAuth from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'github' && profile) {
        try {
          const res = await fetch(`${API_URL}/api/auth/github`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              github_id: String((profile as Record<string, unknown>).id || account.providerAccountId),
              email: user.email,
              name: user.name || (profile as Record<string, unknown>).login || 'User',
              avatar_url: user.image,
            }),
          });
          if (!res.ok) return false;
          const data = await res.json();
          // Store backend JWT on the user object so jwt callback can access it
          (user as unknown as Record<string, unknown>).backendToken = data.token;
          (user as unknown as Record<string, unknown>).backendUser = data.user;
        } catch {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.backendToken = (user as unknown as Record<string, unknown>).backendToken;
        token.backendUser = (user as unknown as Record<string, unknown>).backendUser;
      }
      return token;
    },
    async session({ session, token }) {
      (session as unknown as Record<string, unknown>).backendToken = token.backendToken;
      (session as unknown as Record<string, unknown>).backendUser = token.backendUser;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
