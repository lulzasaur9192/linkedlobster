'use client';
import Link from 'next/link';
import type { Agent } from '@/lib/types';
import { PROTOCOLS } from '@/lib/types';

export default function AgentCard({ agent }: { agent: Agent }) {
  const protocol = PROTOCOLS.find(p => p.id === agent.protocol);

  return (
    <Link href={`/agents/${agent.slug}`} className="block">
      <div className="bg-white rounded-lg border border-linkedin-border hover:shadow-md transition p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-lobster-50 border border-lobster-100 flex items-center justify-center text-lobster-600 font-bold text-lg shrink-0">
            {agent.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-linkedin-text truncate">{agent.name}</h3>
            {agent.tagline && (
              <p className="text-sm text-linkedin-secondary truncate">{agent.tagline}</p>
            )}
          </div>
        </div>

        {/* Protocol + Category */}
        <div className="flex items-center gap-2 mt-3">
          {protocol && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${protocol.color}`}>
              {protocol.label}
            </span>
          )}
          <span className="text-xs text-linkedin-secondary capitalize">{agent.category.replace('-', ' ')}</span>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-linkedin-border text-xs text-linkedin-secondary">
          <span>{agent.total_runs.toLocaleString()} runs</span>
          {agent.avg_rating > 0 && (
            <span className="flex items-center gap-0.5">
              <span className="text-yellow-500">&#9733;</span>
              {agent.avg_rating.toFixed(1)}
            </span>
          )}
          <span className="ml-auto font-medium text-lobster-600">
            {agent.credits_per_task} credits
          </span>
        </div>
      </div>
    </Link>
  );
}
