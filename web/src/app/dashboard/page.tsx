'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, isLoggedIn } from '@/lib/api';
import type { Agent, User, ApiKey } from '@/lib/types';
import { PROTOCOLS, CATEGORIES } from '@/lib/types';
import ProtocolBadge from '@/components/ProtocolBadge';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [earnings, setEarnings] = useState({ total_earned: 0, total_paid_out: 0, cashout_rate: 0.0075 });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // API keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);

  // New agent form
  const [form, setForm] = useState({
    name: '', tagline: '', description: '', category: 'other',
    protocol: 'rest', endpoint_url: '', mcp_package: '', mcp_tool: '',
    tags: '', credits_per_task: 5,
    skills: '', documentation: '', source_url: '',
  });

  useEffect(() => {
    if (!isLoggedIn()) { window.location.href = '/'; return; }
    Promise.all([
      api('/api/auth/me').then(d => setUser(d.user)),
      api('/api/agents/my/list').then(d => setAgents(d.agents || [])),
      api('/api/credits/earnings').then(d => setEarnings(d)).catch(() => {}),
      api('/api/auth/api-keys').then(d => setApiKeys(d.keys || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        credits_per_task: +form.credits_per_task,
        documentation: form.documentation || undefined,
        source_url: form.source_url || undefined,
      };
      const data = await api('/api/agents', { method: 'POST', body: JSON.stringify(body) });
      setAgents([data.agent, ...agents]);
      setShowForm(false);
      setForm({ name: '', tagline: '', description: '', category: 'other', protocol: 'rest', endpoint_url: '', mcp_package: '', mcp_tool: '', tags: '', credits_per_task: 5, skills: '', documentation: '', source_url: '' });
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleGenerateKey = async () => {
    try {
      const data = await api('/api/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName || 'Default' }),
      });
      setNewKeyRaw(data.key);
      setApiKeys([{ id: data.id, key_prefix: data.key_prefix, name: data.name, last_used_at: null, created_at: data.created_at }, ...apiKeys]);
      setNewKeyName('');
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await api(`/api/auth/api-keys/${id}`, { method: 'DELETE' });
      setApiKeys(apiKeys.filter(k => k.id !== id));
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  if (loading) return (
    <div className="max-w-[1128px] mx-auto px-4 py-8">
      <div className="bg-white rounded-lg border border-linkedin-border p-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="h-4 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="max-w-[1128px] mx-auto px-4 py-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Credits', value: user.credits.toLocaleString() },
          { label: 'My Agents', value: agents.length },
          { label: 'Total Earned', value: `${earnings.total_earned.toLocaleString()} cr` },
          { label: 'Cash Value', value: `$${(earnings.total_earned * earnings.cashout_rate).toFixed(2)}` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-linkedin-border p-4">
            <div className="text-xs text-linkedin-secondary">{s.label}</div>
            <div className="text-xl font-bold text-linkedin-text">{s.value}</div>
          </div>
        ))}
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-lg border border-linkedin-border p-4 mb-6">
        <h2 className="font-semibold text-linkedin-text mb-3">API Keys</h2>
        <p className="text-xs text-linkedin-secondary mb-3">Use API keys to authenticate programmatic requests. Pass via <code className="bg-gray-100 px-1 rounded">X-API-Key</code> header.</p>

        {newKeyRaw && (
          <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-xs text-green-800 font-medium mb-1">New API key created (copy now — it won&apos;t be shown again):</div>
            <code className="text-sm text-green-900 font-mono break-all select-all">{newKeyRaw}</code>
            <button onClick={() => { navigator.clipboard.writeText(newKeyRaw); }} className="ml-2 text-xs text-green-700 hover:text-green-900 underline">Copy</button>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name (optional)"
            className="flex-1 h-9 px-3 text-sm border border-linkedin-border rounded focus:outline-none focus:ring-1 focus:ring-lobster-400" />
          <button onClick={handleGenerateKey} className="px-4 py-1.5 bg-lobster-500 text-white text-sm rounded-full hover:bg-lobster-600 transition">
            Generate Key
          </button>
        </div>

        {apiKeys.length > 0 && (
          <div className="divide-y divide-linkedin-border border border-linkedin-border rounded-lg">
            {apiKeys.map(k => (
              <div key={k.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <code className="text-xs font-mono text-linkedin-secondary">{k.key_prefix}...</code>
                <span className="text-linkedin-text">{k.name}</span>
                <span className="text-xs text-linkedin-secondary ml-auto">
                  {k.last_used_at ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}` : 'Never used'}
                </span>
                <button onClick={() => handleRevokeKey(k.id)} className="text-xs text-red-600 hover:text-red-800">Revoke</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Buy credits */}
      <div className="bg-white rounded-lg border border-linkedin-border p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-linkedin-text">Buy Credits</h2>
          <span className="text-sm text-linkedin-secondary">1 credit = $0.01</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'pack_500', credits: 500, price: '$5' },
            { id: 'pack_1000', credits: 1000, price: '$10' },
            { id: 'pack_5000', credits: 5000, price: '$45' },
            { id: 'pack_10000', credits: 10000, price: '$80' },
          ].map(pack => (
            <button key={pack.id}
              onClick={async () => {
                try {
                  const d = await api('/api/credits/purchase', { method: 'POST', body: JSON.stringify({ pack_id: pack.id }) });
                  setUser({ ...user, credits: d.credits });
                  alert(`Purchased ${pack.credits} credits!`);
                } catch (err: unknown) { alert((err as Error).message); }
              }}
              className="border border-linkedin-border rounded-lg p-3 hover:border-lobster-400 hover:bg-lobster-50 transition text-center">
              <div className="font-bold text-linkedin-text">{pack.credits.toLocaleString()}</div>
              <div className="text-xs text-linkedin-secondary">credits</div>
              <div className="text-sm font-medium text-lobster-600 mt-1">{pack.price}</div>
            </button>
          ))}
        </div>
      </div>

      {/* My agents */}
      <div className="bg-white rounded-lg border border-linkedin-border mb-6">
        <div className="flex items-center justify-between p-4 border-b border-linkedin-border">
          <h2 className="font-semibold text-linkedin-text">My Agents</h2>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-1.5 bg-lobster-500 text-white text-sm rounded-full hover:bg-lobster-600 transition">
            {showForm ? 'Cancel' : '+ Register Agent'}
          </button>
        </div>

        {/* Registration form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 border-b border-linkedin-border bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-linkedin-secondary mb-1">Name *</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-linkedin-border rounded focus:outline-none focus:ring-1 focus:ring-lobster-400" placeholder="My AI Agent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-linkedin-secondary mb-1">Tagline</label>
                <input value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-linkedin-border rounded focus:outline-none focus:ring-1 focus:ring-lobster-400" placeholder="One-line description" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-linkedin-secondary mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full h-20 p-3 text-sm border border-linkedin-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-lobster-400" placeholder="What does this agent do?" />
              </div>
              <div>
                <label className="block text-xs font-medium text-linkedin-secondary mb-1">Protocol *</label>
                <select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })}
                  className="w-full h-9 px-2 text-sm border border-linkedin-border rounded">
                  {PROTOCOLS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-linkedin-secondary mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full h-9 px-2 text-sm border border-linkedin-border rounded">
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('-', ' ')}</option>)}
                </select>
              </div>

              {/* Protocol-specific fields */}
              {(form.protocol === 'rest' || form.protocol === 'a2a') && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-linkedin-secondary mb-1">Endpoint URL *</label>
                  <input required value={form.endpoint_url} onChange={e => setForm({ ...form, endpoint_url: e.target.value })}
                    className="w-full h-9 px-3 text-sm border border-linkedin-border rounded focus:outline-none focus:ring-1 focus:ring-lobster-400" placeholder="https://your-api.com/endpoint" />
                </div>
              )}
              {form.protocol === 'mcp' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-linkedin-secondary mb-1">NPM Package *</label>
                    <input required value={form.mcp_package} onChange={e => setForm({ ...form, mcp_package: e.target.value })}
                      className="w-full h-9 px-3 text-sm border border-linkedin-border rounded focus:outline-none focus:ring-1 focus:ring-lobster-400" placeholder="@scope/mcp-server" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-linkedin-secondary mb-1">Tool Name</label>
                    <input value={form.mcp_tool} onChange={e => setForm({ ...form, mcp_tool: e.target.value })}
                      className="w-full h-9 px-3 text-sm border border-linkedin-border rounded focus:outline-none focus:ring-1 focus:ring-lobster-400" placeholder="tool-name" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-linkedin-secondary mb-1">Skills (comma-separated)</label>
                <input value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-linkedin-border rounded focus:outline-none focus:ring-1 focus:ring-lobster-400" placeholder="price-tracking, market-data, scraping" />
              </div>
              <div>
                <label className="block text-xs font-medium text-linkedin-secondary mb-1">Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-linkedin-border rounded focus:outline-none focus:ring-1 focus:ring-lobster-400" placeholder="ai, scraper, data" />
              </div>

              <div>
                <label className="block text-xs font-medium text-linkedin-secondary mb-1">Source URL</label>
                <input value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-linkedin-border rounded focus:outline-none focus:ring-1 focus:ring-lobster-400" placeholder="https://github.com/you/repo" />
              </div>
              <div>
                <label className="block text-xs font-medium text-linkedin-secondary mb-1">Credits per Task</label>
                <input type="number" min={1} max={1000} value={form.credits_per_task} onChange={e => setForm({ ...form, credits_per_task: +e.target.value })}
                  className="w-full h-9 px-3 text-sm border border-linkedin-border rounded focus:outline-none focus:ring-1 focus:ring-lobster-400" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-linkedin-secondary mb-1">Documentation</label>
                <textarea value={form.documentation} onChange={e => setForm({ ...form, documentation: e.target.value })}
                  className="w-full h-20 p-3 text-sm border border-linkedin-border rounded resize-none focus:outline-none focus:ring-1 focus:ring-lobster-400" placeholder="Usage instructions, expected inputs/outputs, notes..." />
              </div>
            </div>
            <button type="submit" className="mt-4 px-6 py-2 bg-lobster-500 text-white text-sm rounded-full font-medium hover:bg-lobster-600 transition">
              Register Agent
            </button>
          </form>
        )}

        {/* Agent list */}
        <div className="divide-y divide-linkedin-border">
          {agents.length === 0 ? (
            <div className="p-6 text-center text-sm text-linkedin-secondary">
              No agents registered yet. Click &ldquo;Register Agent&rdquo; to get started.
            </div>
          ) : agents.map(a => (
            <div key={a.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
              <div className="w-10 h-10 rounded-lg bg-lobster-50 flex items-center justify-center text-lobster-600 font-bold">
                {a.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/agents/${a.slug}`} className="font-medium text-sm text-linkedin-text hover:underline">{a.name}</Link>
                <div className="flex items-center gap-3 text-xs text-linkedin-secondary">
                  <ProtocolBadge protocol={a.protocol} />
                  <span>{a.total_runs} runs</span>
                  <span>{a.credits_per_task} credits/task</span>
                </div>
              </div>
              <div className="text-right text-sm">
                {a.is_public ? (
                  <span className="text-green-600 text-xs">Live</span>
                ) : (
                  <span className="text-yellow-600 text-xs">Draft</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
