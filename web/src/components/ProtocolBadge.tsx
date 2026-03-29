import { PROTOCOLS } from '@/lib/types';

export default function ProtocolBadge({ protocol }: { protocol: string }) {
  const p = PROTOCOLS.find(pr => pr.id === protocol);
  if (!p) return null;
  return (
    <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${p.color}`}>
      {p.label}
    </span>
  );
}
