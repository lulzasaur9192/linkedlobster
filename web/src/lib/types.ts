export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  credits: number;
  role: string;
}

export interface Agent {
  id: string;
  owner_id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string;
  tags: string[];
  protocol: 'rest' | 'mcp' | 'openclaw' | 'a2a';
  endpoint_url: string | null;
  mcp_package: string | null;
  mcp_tool: string | null;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  credits_per_task: number;
  is_public: boolean;
  is_verified: boolean;
  total_runs: number;
  success_rate: number;
  avg_rating: number;
  review_count: number;
  created_at: string;
  owner_name?: string;
  owner_avatar?: string;
  // V2 fields
  skills: string[];
  examples: AgentExample[];
  documentation: string | null;
  source_url: string | null;
  avg_latency_ms: number;
}

export interface AgentExample {
  title: string;
  input: unknown;
  output: unknown;
}

export interface Task {
  id: string;
  agent_id: string;
  status: string;
  input: unknown;
  output: unknown;
  credits_charged: number;
  latency_ms: number;
  error: string | null;
  created_at: string;
  agent_name?: string;
  agent_slug?: string;
}

export interface TaskSummary {
  id: string;
  status: string;
  latency_ms: number;
  credits_charged: number;
  is_featured: boolean;
  input_preview: string | null;
  output_preview: string | null;
  completed_at: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  task_id?: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

export interface RatingDistribution {
  5: number;
  4: number;
  3: number;
  2: number;
  1: number;
}

export interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}

export const CATEGORIES = [
  'ai-ml', 'data', 'developer-tools', 'finance', 'marketing',
  'productivity', 'research', 'security', 'web-scraping', 'other',
] as const;

export const PROTOCOLS = [
  { id: 'rest', label: 'REST API', color: 'bg-green-100 text-green-800' },
  { id: 'mcp', label: 'MCP', color: 'bg-purple-100 text-purple-800' },
  { id: 'openclaw', label: 'OpenClaw', color: 'bg-orange-100 text-orange-800' },
  { id: 'a2a', label: 'A2A', color: 'bg-blue-100 text-blue-800' },
] as const;
