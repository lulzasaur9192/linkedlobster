// MCP Protocol Adapter — spawns MCP stdio client, calls tool, returns result
import { spawn } from 'child_process';

export async function executeMcp(agent, input) {
  const start = Date.now();

  // MCP stdio protocol: spawn the server, send JSON-RPC messages
  const command = agent.mcp_package.startsWith('npx ')
    ? agent.mcp_package : `npx ${agent.mcp_package}`;
  const [cmd, ...args] = command.split(' ');

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      proc.kill();
      resolve({ success: false, error: 'MCP execution timed out (30s)', latency_ms: Date.now() - start });
    }, 30000);

    const proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d; });
    proc.stderr.on('data', (d) => { stderr += d; });

    // Send JSON-RPC initialize
    const initMsg = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'linkedlobster', version: '1.0.0' } } }) + '\n';
    proc.stdin.write(initMsg);

    // Send tool call after a brief delay for init
    setTimeout(() => {
      const callMsg = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: agent.mcp_tool, arguments: input } }) + '\n';
      proc.stdin.write(callMsg);

      // Give it time to respond, then close
      setTimeout(() => {
        proc.stdin.end();
      }, 1000);
    }, 500);

    proc.on('close', () => {
      clearTimeout(timeout);
      const latency = Date.now() - start;
      try {
        // Parse JSON-RPC responses from stdout
        const lines = stdout.split('\n').filter(Boolean);
        const responses = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        const toolResult = responses.find(r => r.id === 2);
        if (toolResult?.result) {
          resolve({ success: true, output: toolResult.result, latency_ms: latency });
        } else if (toolResult?.error) {
          resolve({ success: false, error: toolResult.error.message, latency_ms: latency });
        } else {
          resolve({ success: false, error: stderr || 'No response from MCP server', latency_ms: latency });
        }
      } catch (err) {
        resolve({ success: false, error: err.message, latency_ms: latency });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      resolve({ success: false, error: `Failed to spawn MCP: ${err.message}`, latency_ms: Date.now() - start });
    });
  });
}

// Discover tools from an MCP server
export async function discoverMcpTools(mcpPackage) {
  const command = mcpPackage.startsWith('npx ') ? mcpPackage : `npx ${mcpPackage}`;
  const [cmd, ...args] = command.split(' ');

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      proc.kill();
      resolve({ tools: [], error: 'Discovery timed out' });
    }, 15000);

    const proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';

    proc.stdout.on('data', (d) => { stdout += d; });

    const initMsg = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'linkedlobster', version: '1.0.0' } } }) + '\n';
    proc.stdin.write(initMsg);

    setTimeout(() => {
      const listMsg = JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }) + '\n';
      proc.stdin.write(listMsg);
      setTimeout(() => { proc.stdin.end(); }, 1000);
    }, 500);

    proc.on('close', () => {
      clearTimeout(timeout);
      try {
        const lines = stdout.split('\n').filter(Boolean);
        const responses = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        const toolsResult = responses.find(r => r.id === 2);
        resolve({ tools: toolsResult?.result?.tools || [] });
      } catch {
        resolve({ tools: [] });
      }
    });

    proc.on('error', () => {
      clearTimeout(timeout);
      resolve({ tools: [], error: 'Failed to spawn MCP server' });
    });
  });
}
