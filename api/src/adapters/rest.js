// REST Protocol Adapter — proxies requests to builder's REST endpoint

export async function executeRest(agent, input) {
  const start = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(agent.endpoint_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-LinkedLobster-Task': 'true' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latency = Date.now() - start;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return { success: false, error: `Endpoint returned ${response.status}: ${errorText}`, latency_ms: latency };
    }

    const contentType = response.headers.get('content-type') || '';
    let output;
    if (contentType.includes('application/json')) {
      output = await response.json();
    } else {
      output = { text: await response.text() };
    }

    return { success: true, output, latency_ms: latency };
  } catch (err) {
    clearTimeout(timeout);
    const latency = Date.now() - start;
    if (err.name === 'AbortError') {
      return { success: false, error: 'Request timed out (30s)', latency_ms: latency };
    }
    return { success: false, error: err.message, latency_ms: latency };
  }
}

// Health check — verify endpoint is reachable
export async function healthCheckRest(endpointUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(endpointUrl, { method: 'HEAD', signal: controller.signal });
    clearTimeout(timeout);
    // Accept any response as "reachable" (even 405 Method Not Allowed is fine for HEAD)
    return { healthy: res.status < 500, status: res.status };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}
