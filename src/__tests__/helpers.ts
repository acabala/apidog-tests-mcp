import { vi } from "vitest";
import type { ApidogClient } from "../client.js";

export interface MockApidogClient {
	project: string;
	get: ReturnType<typeof vi.fn>;
	post: ReturnType<typeof vi.fn>;
	put: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
	postForm: ReturnType<typeof vi.fn>;
}

export function createMockClient(projectId = "TEST_PROJECT"): MockApidogClient {
	return {
		project: projectId,
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
		postForm: vi.fn(),
	};
}

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

interface RegisteredTool {
	name: string;
	description: string;
	schema: Record<string, unknown>;
	handler: ToolHandler;
}

/**
 * Lightweight spy that captures tools registered via server.tool().
 * Allows tests to invoke handlers directly without a real MCP transport.
 */
export function createMockServer() {
	const tools = new Map<string, RegisteredTool>();

	const server = {
		tool(name: string, description: string, schema: Record<string, unknown>, handler: ToolHandler) {
			tools.set(name, { name, description, schema, handler });
		},
	};

	return {
		server,
		tools,
		getHandler(name: string): ToolHandler {
			const tool = tools.get(name);
			if (!tool) throw new Error(`Tool "${name}" not registered`);
			return tool.handler;
		},
		getToolNames(): string[] {
			return Array.from(tools.keys());
		},
	};
}

export function asClient(mock: MockApidogClient): ApidogClient {
	return mock as unknown as ApidogClient;
}
