// OpenClaw Protocol Adapter — loads skill from ClawHub, executes

export async function executeOpenclaw(agent, input) {
  const start = Date.now();

  // OpenClaw skills are loaded via their runtime
  // For now, treat them like REST endpoints to their ClawHub hosting
  // Full OpenClaw runtime integration would spawn the skill in a sandbox
  try {
    // Try to invoke via ClawHub's execution API
    const clawHubUrl = `https://clawhub.dev/api/skills/${agent.openclaw_package}/execute`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(clawHubUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill: agent.openclaw_skill, input }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latency = Date.now() - start;

    if (!response.ok) {
      return { success: false, error: `OpenClaw returned ${response.status}`, latency_ms: latency };
    }

    const output = await response.json();
    return { success: true, output, latency_ms: latency };
  } catch (err) {
    return { success: false, error: err.message, latency_ms: Date.now() - start };
  }
}
