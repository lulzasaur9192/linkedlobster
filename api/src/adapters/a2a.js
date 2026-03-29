// A2A (Agent-to-Agent) Protocol Adapter — Google's Agent Card spec

export async function executeA2a(agent, input) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    // A2A sends a task message to the agent endpoint
    const taskMessage = {
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tasks/send',
      params: {
        id: crypto.randomUUID(),
        message: {
          role: 'user',
          parts: [{ type: 'text', text: typeof input === 'string' ? input : JSON.stringify(input) }],
        },
      },
    };

    const response = await fetch(agent.endpoint_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskMessage),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latency = Date.now() - start;

    if (!response.ok) {
      return { success: false, error: `A2A endpoint returned ${response.status}`, latency_ms: latency };
    }

    const result = await response.json();
    if (result.error) {
      return { success: false, error: result.error.message, latency_ms: latency };
    }

    return { success: true, output: result.result, latency_ms: latency };
  } catch (err) {
    clearTimeout(timeout);
    const latency = Date.now() - start;
    return { success: false, error: err.name === 'AbortError' ? 'A2A request timed out' : err.message, latency_ms: latency };
  }
}

// Fetch Agent Card for discovery
export async function fetchAgentCard(endpointUrl) {
  try {
    const base = new URL(endpointUrl).origin;
    const res = await fetch(`${base}/.well-known/agent-card.json`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { card: null, error: `Agent Card returned ${res.status}` };
    return { card: await res.json() };
  } catch (err) {
    return { card: null, error: err.message };
  }
}
