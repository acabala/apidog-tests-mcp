#!/usr/bin/env node
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ApidogClient } from "./client.js";
import { toPublicErrorMessage } from "./errors.js";
import { registerFolderTools } from "./tools/folders.js";
import { registerReadTools } from "./tools/read.js";
import { registerTestCaseTools } from "./tools/test-cases.js";
import { registerTestDataTools } from "./tools/test-data.js";
import { registerTestScenarioTools } from "./tools/test-scenarios.js";
import { registerTestSuiteTools } from "./tools/test-suites.js";

const require = createRequire(import.meta.url);
const { name, version } = require("../package.json") as { name: string; version: string };

async function main(): Promise<void> {
	const client = ApidogClient.fromEnv();

	const server = new McpServer({ name, version });

	registerReadTools(server, client);
	registerTestCaseTools(server, client);
	registerTestScenarioTools(server, client);
	registerTestSuiteTools(server, client);
	registerFolderTools(server, client);
	registerTestDataTools(server, client);

	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("apidog-tests-mcp server started");
}

main().catch((error) => {
	console.error("Fatal error starting apidog-tests-mcp:", toPublicErrorMessage(error));
	process.exit(1);
});
