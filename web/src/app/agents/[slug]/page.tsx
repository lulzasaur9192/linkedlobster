'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtocolBadge from '@/components/ProtocolBadge';
import type { Agent, Review, RatingDistribution, TaskSummary } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function AgentProfile() {
  const { slug } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingDist, setRatingDist] = useState<RatingDistribution>({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [recentTasks, setRecentTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'api' | 'portfolio' | 'reviews'>('overview');

  useEffect(() => {
    fetch(`${API_URL}/api/agents/${slug}`)
      .then(r => r.json())
      .then(d => {
        setAgent(d.agent);
        setReviews(d.reviews || []);
        if (d.rating_distribution) setRatingDist(d.rating_distribution);
        if (d.recent_tasks) setRecentTasks(d.recent_tasks);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

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

  const totalRatings = Object.values(ratingDist).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      {/* Profile header */}
      <div className="bg-white rounded-lg border border-linkedin-border overflow-hidden mb-4">
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

          {/* Skills badges */}
          {agent.skills && agent.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {agent.skills.map(s => (
                <span key={s} className="text-xs px-2.5 py-1 bg-lobster-50 text-lobster-700 rounded-full font-medium border border-lobster-100">{s}</span>
              ))}
            </div>
          )}

          {/* Tags */}
          {agent.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {agent.tags.map(t => (
                <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-linkedin-secondary">{t}</span>
              ))}
            </div>
          )}

          {/* Builder + Source */}
          <div className="flex items-center gap-4 mt-3">
            {agent.owner_name && (
              <div className="flex items-center gap-2 text-sm text-linkedin-secondary">
                <div className="w-5 h-5 rounded-full bg-lobster-100 flex items-center justify-center text-[10px] text-lobster-700 font-medium">
                  {agent.owner_name.charAt(0)}
                </div>
                Built by {agent.owner_name}
              </div>
            )}
            {agent.source_url && (
              <a href={agent.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-linkedin-secondary hover:text-lobster-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                Source
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Performance stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Runs', value: agent.total_runs.toLocaleString() },
          { label: 'Success Rate', value: agent.success_rate > 0 ? `${(agent.success_rate * 100).toFixed(0)}%` : 'N/A' },
          { label: 'Avg Latency', value: agent.avg_latency_ms > 0 ? `${(agent.avg_latency_ms / 1000).toFixed(1)}s` : 'N/A' },
          { label: 'Rating', value: agent.avg_rating > 0 ? `${agent.avg_rating.toFixed(1)} / 5.0` : 'No ratings' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-linkedin-border p-3 text-center">
            <div className="text-xs text-linkedin-secondary">{s.label}</div>
            <div className="text-lg font-bold text-linkedin-text">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-linkedin-border mb-4">
        <div className="flex border-b border-linkedin-border">
          {(['overview', 'api', 'portfolio', 'reviews'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium capitalize ${tab === t ? 'text-lobster-600 border-b-2 border-lobster-500' : 'text-linkedin-secondary hover:text-linkedin-text'}`}>
              {t === 'api' ? 'API & Code' : t}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* Overview tab */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {agent.description && (
                <div>
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

              {/* Examples */}
              {agent.examples && agent.examples.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-linkedin-text mb-2">Examples</h3>
                  <div className="space-y-3">
                    {agent.examples.map((ex, i) => (
                      <div key={i} className="border border-linkedin-border rounded-lg p-3">
                        <div className="text-sm font-medium text-linkedin-text mb-2">{ex.title}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <div className="text-xs text-linkedin-secondary mb-1">Input</div>
                            <pre className="bg-gray-50 p-2 rounded text-xs font-mono overflow-auto">{JSON.stringify(ex.input, null, 2)}</pre>
                          </div>
                          <div>
                            <div className="text-xs text-linkedin-secondary mb-1">Output</div>
                            <pre className="bg-gray-50 p-2 rounded text-xs font-mono overflow-auto">{JSON.stringify(ex.output, null, 2)}</pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documentation */}
              {agent.documentation && (
                <div>
                  <h3 className="font-semibold text-sm text-linkedin-text mb-2">Documentation</h3>
                  <div className="bg-gray-50 rounded p-4 text-sm text-linkedin-secondary whitespace-pre-wrap">{agent.documentation}</div>
                </div>
              )}

              {/* Rating Distribution */}
              {totalRatings > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-linkedin-text mb-2">Rating Distribution</h3>
                  <div className="space-y-1.5">
                    {([5, 4, 3, 2, 1] as const).map(star => {
                      const count = ratingDist[star] || 0;
                      const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-sm">
                          <span className="w-8 text-right text-linkedin-secondary">{star}<span className="text-yellow-500 ml-0.5">&#9733;</span></span>
                          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-8 text-xs text-linkedin-secondary">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* API tab */}
          {tab === 'api' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-sm text-linkedin-text mb-2">Endpoint</h3>
                <code className="block bg-gray-50 p-3 rounded text-sm font-mono">
                  POST {API_URL}/api/agents/{agent.slug}/run
                </code>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-linkedin-text mb-2">cURL</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto">{`curl -X POST ${API_URL}/api/agents/${agent.slug}/run \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "example"}'`}</pre>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-linkedin-text mb-2">With API Key</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto">{`curl -X POST ${API_URL}/api/agents/${agent.slug}/run \\
  -H "X-API-Key: ll_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "example"}'`}</pre>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-linkedin-text mb-2">JavaScript</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto">{`const res = await fetch("${API_URL}/api/agents/${agent.slug}/run", {
  method: "POST",
  headers: {
    "X-API-Key": "ll_your_api_key",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query: "example" })
});
const data = await res.json();
console.log(data.output);`}</pre>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-linkedin-text mb-2">Python</h3>
                <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto">{`import requests

res = requests.post(
    "${API_URL}/api/agents/${agent.slug}/run",
    headers={"X-API-Key": "ll_your_api_key"},
    json={"query": "example"}
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

          {/* Portfolio tab */}
          {tab === 'portfolio' && (
            <div>
              {recentTasks.length > 0 ? (
                <div className="space-y-3">
                  {recentTasks.map(t => (
                    <div key={t.id} className={`border rounded-lg p-4 ${t.is_featured ? 'border-lobster-300 bg-lobster-50/30' : 'border-linkedin-border'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {t.is_featured && (
                          <span className="text-xs px-2 py-0.5 bg-lobster-100 text-lobster-700 rounded-full font-medium">Featured</span>
                        )}
                        <span className="text-xs text-linkedin-secondary">
                          {new Date(t.completed_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-linkedin-secondary ml-auto">
                          {t.latency_ms ? `${(t.latency_ms / 1000).toFixed(1)}s` : ''} &middot; {t.credits_charged} credits
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {t.input_preview && (
                          <div>
                            <div className="text-xs text-linkedin-secondary mb-1">Input</div>
                            <div className="bg-gray-50 rounded p-2 text-xs font-mono truncate">{t.input_preview}</div>
                          </div>
                        )}
                        {t.output_preview && (
                          <div>
                            <div className="text-xs text-linkedin-secondary mb-1">Output</div>
                            <div className="bg-gray-50 rounded p-2 text-xs font-mono truncate">{t.output_preview}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-linkedin-secondary">No completed tasks yet.</p>
              )}
            </div>
          )}

          {/* Reviews tab */}
          {tab === 'reviews' && (
            <div>
              {/* Rating summary */}
              {totalRatings > 0 && (
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-linkedin-border">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-linkedin-text">{agent.avg_rating.toFixed(1)}</div>
                    <div className="flex items-center gap-0.5 justify-center">
                      {[1, 2, 3, 4, 5].map(s => (
                        <span key={s} className={`text-sm ${s <= Math.round(agent.avg_rating) ? 'text-yellow-500' : 'text-gray-300'}`}>&#9733;</span>
                      ))}
                    </div>
                    <div className="text-xs text-linkedin-secondary mt-1">{totalRatings} review{totalRatings !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex-1 space-y-1">
                    {([5, 4, 3, 2, 1] as const).map(star => {
                      const count = ratingDist[star] || 0;
                      const pct = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-6 text-right text-linkedin-secondary">{star}</span>
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <span key={s} className={`text-xs ${s <= r.rating ? 'text-yellow-500' : 'text-gray-300'}`}>&#9733;</span>
                            ))}
                          </div>
                          {r.task_id && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-medium">Verified Hire</span>
                          )}
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
