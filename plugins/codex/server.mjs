import { readFile } from "node:fs/promises";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const uri = "ui://brainrot/player.html";
const html = await readFile(new URL("./widget.html", import.meta.url), "utf8");
const script = await readFile(new URL("./widget.js", import.meta.url), "utf8");
const server = new McpServer({ name: "brainrot-codex", version: "0.1.0" });

registerAppResource(server, "brainrot-player", uri, {}, async () => ({
  contents: [{
    uri,
    mimeType: RESOURCE_MIME_TYPE,
    text: html.replace("<!-- widget-script -->", () => "<script>" + script + "</script>"),
  }],
}));

registerAppTool(server, "show_brainrot", {
  description: "Open the Brainrot player when explicitly requested. Videos are selected inside the widget.",
  annotations: { readOnlyHint: true },
  _meta: { ui: { resourceUri: uri } },
}, async () => ({
  content: [{ type: "text", text: "Select at least three local video files in the Brainrot widget. If no widget appears, this host has not rendered the MCP Apps resource." }],
}));

await server.connect(new StdioServerTransport());
