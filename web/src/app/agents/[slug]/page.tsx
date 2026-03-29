'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtocolBadge from '@/components/ProtocolBadge';
import { api, isLoggedIn } from '@/lib/api';
import type { Agent, Review } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AgentProfile() {
  const { slug } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tryInput, setTryInput] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ output?: unknown; error?: string } | null>(null);
  const [tab, setTab] = useState<'overview' | 'api' | 'reviews'>('overview');

  useEffect(() => {
    fetch(`${API_URL}/api/agents/${slug}`)
      .then(r => r.json())
      .then(d => { setAgent(d.agent); setReviews(d.reviews || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  const handleRun = async () => {
    if (!isLoggedIn()) { alert('Sign in to hire this agent'); return; }
    setRunning(true);
    setResult(null);
    try {
      let input;
      try { input = JSON.parse(tryInput); } catch { input = { query: tryInput }; }
      const data = await api(`/api/agents/${slug}/run`, { method: 'POST', body: JSON.stringify(input) });
      setResult({ output: data.output });
    } catch (err: unknown) {
      setResult({ error: (err as Error).message });
    } finally {
      setRunning(false);
    }
  };

  if (loading) return (
    <div className="max-w-[1128px] mx-auto px-4 py-8">
      <div className="bg-white rounded-lg border border-linkedin-border p-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-100 rounded w-2/3" />
      </div>
    </div>
  );

  if (!agent) return (
    <div className="max-w-[1128px] mx-auto px-4 py-8 text-center">
      <p className="text-linkedin-secondary">Agent not found.</p>
      <Link href="/agents" className="text-lobster-600 hover:underline text-sm mt-2 inline-block">Browse agents</Link>
    </div>
  );

  const inputFields = agent.input_schema && typeof agent.input_schema === 'object'
    ? Object.entries((agent.input_schema as Record<string, unknown>).properties || {})
    : [];

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      {/* Profile header — LinkedIn style */}
      <div className="bg-white rounded-lg border border-linkedin-border overflow-hidden mb-4">
        {/* Banner */}
        <div className="h-20 bg-gradient-to-r from-lobster-400 to-lobster-600" />

        <div className="px-6 pb-5 -mt-8">
          <div className="flex items-end gap-4 mb-3">
            <div className="w-20 h-20 rounded-lg bg-white border-4 border-white shadow flex items-center justify-center text-3xl font-bold text-lobster-600">
              {agent.name.charAt(0)}
            </div>
            <div className="flex-1 pt-10">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-linkedin-text">{agent.name}</h1>
                {agent.is_verified && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Verified</span>
                )}
              </div>
              {agent.tagline && <p className="text-sm text-linkedin-secondary">{agent.tagline}</p>}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-lobster-600">{agent.credits_per_task}</div>
              <div className="text-xs text-linkedin-secondary">credits/task</div>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 text-sm text-linkedin-secondary">
            <ProtocolBadge protocol={agent.protocol} />
            <span className="capitalize">{agent.category.replace('-', ' ')}</span>
            <span>{agent.total_runs.toLocaleString()} runs</span>
            {agent.avg_rating > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-yellow-500">&#9733;</span>
                {agent.avg_rating.toFixed(1)} ({agent.review_count})
              </span>
            )}
            {agent.success_rate > 0 && (
              <span>{(agent.success_rate * 100).toFixed(0)}% success</span>
            )}
          </div>

          {/* Tags */}
          {agent.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {agent.tags.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-linkedin-secondary">{t}</span>
              ))}
            </div>
          )}

          {/* Builder */}
          {agent.owner_name && (
            <div className="flex items-center gap-2 mt-3 text-sm text-linkedin-secondary">
              <div className="w-5 h-5 rounded-full bg-lobster-100 flex items-center justify-center text-[10px] text-lobster-700 font-medium">
                {agent.owner_name.charAt(0)}
              </div>
              Built by {agent.owner_name}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-linkedin-border mb-4">
        <div className="flex border-b border-linkedin-border">
          {(['overview', 'api', 'reviews'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize ${tab === t ? 'text-lobster-600 border-b-2 border-lobster-500' : 'text-linkedin-secondary hover:text-linkedin-text'}`}>
              {t === 'api' ? 'API & Code' : t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Overview tab */}
          {tab === 'overview' && (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                {agent.description && (
                  <div className="mb-5">
                    <h3 className="font-semibold text-sm text-linkedin-text mb-2">About</h3>
                    <p className="text-sm text-linkedin-secondary whitespace-pre-wrap">{agent.description}</p>
                  </div>
                )}
                {inputFields.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-linkedin-text mb-2">Input Schema</h3>
                    <div className="bg-gray-50 rounded p-3 text-xs font-mono overflow-auto">
                      {JSON.stringify(agent.input_schema, null, 2)}
                    </div>
                  </div>
                )}
              </div>

              {/* Try it panel */}
              <div className="lg:w-[360px] shrink-0">
                <div className="border border-linkedin-border rounded-lg p-4">
                  <h3 className="font-semibold text-sm text-linkedin-text mb-3">Try It</h3>
                  <textarea
                    value={tryInput}
                    onChange={e => setTryInput(e.target.value)}
                    placeholder='{"query": "your input here"}'
                    className="w-full h-24 p-3 text-sm border border-linkedin-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-lobster-400 font-mono"
                  />
                  <button
                    onClick={handleRun}
                    disabled={running || !tryInput.trim()}
                    className="w-full mt-2 py-2 bg-lobster-500 text-white text-sm rounded-full font-medium hover:bg-lobster-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {running ? 'Running...' : `Hire — ${agent.credits_per_task} credits`}
                  </button>

                  {result && (
                    <div className={`mt-3 p-3 rounded text-xs font-mono overflow-auto max-h-60 ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
                      {result.error || JSON.stringify(result.output, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* API tab */}
          {tab === 'api' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-sm text-linkedin-text mb-2">Endpoint</h3>
                <code className="block bg-gray-50 p-3 rounded text-sm font-mono">
                  POST {typeof window !== 'undefined' ? window.location.origin : ''}/api/agents/{agent.slug}/run
                </code>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-linkedin-text mb-2">cURL</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto">{`curl -X POST ${API_URL}/api/agents/${agent.slug}/run \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${tryInput || '{"query": "example"}'}'`}</pre>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-linkedin-text mb-2">JavaScript</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto">{`const res = await fetch("${API_URL}/api/agents/${agent.slug}/run", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${tryInput || '{ query: "example" }'})
});
const data = await res.json();
console.log(data.output);`}</pre>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-linkedin-text mb-2">Python</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto">{`import requests

res = requests.post(
    "${API_URL}/api/agents/${agent.slug}/run",
    headers={"Authorization": "Bearer YOUR_TOKEN"},
    json=${tryInput || '{"query": "example"}'}
)
print(res.json()["output"])`}</pre>
              </div>

              {agent.protocol === 'mcp' && agent.mcp_package && (
                <div>
                  <h3 className="font-semibold text-sm text-linkedin-text mb-2">MCP Config</h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto">{JSON.stringify({
                    mcpServers: {
                      [agent.slug]: {
                        command: 'npx',
                        args: [agent.mcp_package],
                      }
                    }
                  }, null, 2)}</pre>
                </div>
              )}
            </div>
          )}

          {/* Reviews tab */}
          {tab === 'reviews' && (
            <div>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="flex gap-3 pb-4 border-b border-linkedin-border last:border-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-linkedin-secondary">
                        {(r.reviewer_name || '?').charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{r.reviewer_name || 'Anonymous'}</span>
                          <span className="text-yellow-500 text-sm">{'&#9733;'.repeat(r.rating)}</span>
                        </div>
                        {r.comment && <p className="text-sm text-linkedin-secondary mt-1">{r.comment}</p>}
                        <span className="text-xs text-linkedin-secondary">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-linkedin-secondary">No reviews yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
