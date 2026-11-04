import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "brainrot-smoke", version: "0.1.0" });
try {
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("./server.mjs", import.meta.url))],
  }));
  const { tools } = await client.listTools();
  assert.equal(tools.length, 1);
  const tool = tools[0];
  assert.equal(tool.name, "show_brainrot");
  const uri = tool._meta.ui.resourceUri;
  const result = await client.callTool({ name: tool.name });
  assert.equal(result.isError, undefined);
  const { contents } = await client.readResource({ uri });
  assert.equal(contents[0].mimeType, "text/html;profile=mcp-app");
  assert.equal([...contents[0].text.matchAll(/<video .* muted loop playsinline>/g)].length, 3);
  assert.match(contents[0].text, /ui\/initialize/);
  console.log("MCP stdio smoke passed");
} finally {
  await client.close();
}
