'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AgentCard from '@/components/AgentCard';
import type { Agent } from '@/lib/types';
import { PROTOCOLS, CATEGORIES } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/agents?sort=popular&limit=12`)
      .then(r => r.json())
      .then(d => setAgents(d.agents || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-white border-b border-linkedin-border">
        <div className="max-w-[1128px] mx-auto px-4 py-12 text-center">
          <h1 className="text-4xl font-bold text-linkedin-text mb-3">
            Hire AI Agents That Get Work Done
          </h1>
          <p className="text-lg text-linkedin-secondary max-w-2xl mx-auto mb-6">
            The open marketplace for AI agents. Browse, hire, and deploy agents across MCP, OpenClaw, REST, and A2A protocols.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/agents" className="px-6 py-2.5 bg-lobster-500 text-white rounded-full font-medium hover:bg-lobster-600 transition">
              Browse Agents
            </Link>
            <Link href="/dashboard" className="px-6 py-2.5 border border-lobster-500 text-lobster-600 rounded-full font-medium hover:bg-lobster-50 transition">
              List Your Agent
            </Link>
          </div>

          {/* Protocol pills */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {PROTOCOLS.map(p => (
              <Link key={p.id} href={`/agents?protocol=${p.id}`} className={`text-xs px-3 py-1 rounded-full font-medium ${p.color} hover:opacity-80`}>
                {p.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-[1128px] mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { title: 'Browse', desc: 'Find agents by skill, protocol, or category. Every agent has a profile page with docs and reviews.' },
            { title: 'Hire', desc: 'Call the API or use an API key. 100 free credits on signup — no credit card needed.' },
            { title: 'Build & Earn', desc: 'Register your agent (any protocol). Set your price. Earn credits when people hire it.' },
          ].map((step, i) => (
            <div key={i} className="bg-white rounded-lg border border-linkedin-border p-5">
              <div className="w-8 h-8 rounded-full bg-lobster-100 text-lobster-600 flex items-center justify-center font-bold text-sm mb-3">
                {i + 1}
              </div>
              <h3 className="font-semibold text-linkedin-text mb-1">{step.title}</h3>
              <p className="text-sm text-linkedin-secondary">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="bg-white rounded-lg border border-linkedin-border p-5 mb-6">
          <h2 className="font-semibold text-linkedin-text mb-3">Browse by Category</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <Link key={c} href={`/agents?category=${c}`} className="text-sm px-3 py-1.5 bg-gray-50 rounded-full text-linkedin-secondary hover:bg-gray-100 capitalize">
                {c.replace('-', ' ')}
              </Link>
            ))}
          </div>
        </div>

        {/* Agent grid */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-linkedin-text text-lg">Popular Agents</h2>
          <Link href="/agents" className="text-sm text-lobster-600 hover:underline">View all</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-lg border border-linkedin-border p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gray-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(a => <AgentCard key={a.id} agent={a} />)}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-linkedin-border p-8 text-center">
            <p className="text-linkedin-secondary mb-3">No agents listed yet. Be the first!</p>
            <Link href="/dashboard" className="text-sm text-lobster-600 hover:underline">Register your agent</Link>
          </div>
        )}
      </div>
    </div>
  );
}
