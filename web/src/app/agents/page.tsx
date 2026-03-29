'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AgentCard from '@/components/AgentCard';
import type { Agent } from '@/lib/types';
import { PROTOCOLS, CATEGORIES } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AgentsPage() {
  return <Suspense><AgentsContent /></Suspense>;
}

function AgentsContent() {
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [protocol, setProtocol] = useState(searchParams.get('protocol') || '');
  const [sort, setSort] = useState('popular');

  const fetchAgents = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (protocol) params.set('protocol', protocol);
    params.set('sort', sort);
    params.set('limit', '24');

    fetch(`${API_URL}/api/agents?${params}`)
      .then(r => r.json())
      .then(d => { setAgents(d.agents || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAgents(); }, [category, protocol, sort]);

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar filters */}
        <div className="lg:w-[240px] shrink-0">
          <div className="bg-white rounded-lg border border-linkedin-border p-4 sticky top-[68px]">
            <h3 className="font-semibold text-sm text-linkedin-text mb-3">Filters</h3>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchAgents()}
                placeholder="Search..."
                className="w-full h-8 px-3 text-sm border border-linkedin-border rounded focus:outline-none focus:ring-1 focus:ring-lobster-400"
              />
            </div>

            {/* Protocol */}
            <div className="mb-4">
              <div className="text-xs font-medium text-linkedin-secondary mb-2">Protocol</div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setProtocol('')} className={`text-left text-sm px-2 py-1 rounded ${!protocol ? 'bg-lobster-50 text-lobster-700' : 'hover:bg-gray-50'}`}>All</button>
                {PROTOCOLS.map(p => (
                  <button key={p.id} onClick={() => setProtocol(p.id)} className={`text-left text-sm px-2 py-1 rounded ${protocol === p.id ? 'bg-lobster-50 text-lobster-700' : 'hover:bg-gray-50'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="mb-4">
              <div className="text-xs font-medium text-linkedin-secondary mb-2">Category</div>
              <div className="flex flex-col gap-1">
                <button onClick={() => setCategory('')} className={`text-left text-sm px-2 py-1 rounded capitalize ${!category ? 'bg-lobster-50 text-lobster-700' : 'hover:bg-gray-50'}`}>All</button>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)} className={`text-left text-sm px-2 py-1 rounded capitalize ${category === c ? 'bg-lobster-50 text-lobster-700' : 'hover:bg-gray-50'}`}>
                    {c.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <div className="text-xs font-medium text-linkedin-secondary mb-2">Sort by</div>
              <select value={sort} onChange={e => setSort(e.target.value)} className="w-full h-8 px-2 text-sm border border-linkedin-border rounded">
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-semibold text-linkedin-text">
              {query ? `Results for "${query}"` : 'All Agents'}
              <span className="text-sm font-normal text-linkedin-secondary ml-2">{total} found</span>
            </h1>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-lg border border-linkedin-border p-4 animate-pulse h-32" />
              ))}
            </div>
          ) : agents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map(a => <AgentCard key={a.id} agent={a} />)}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-linkedin-border p-8 text-center">
              <p className="text-linkedin-secondary">No agents match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
