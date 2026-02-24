import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApidogClient } from "../client.js";
import { errorResultFrom, jsonResult } from "../types.js";

interface ApiTreeNode {
	name?: string;
	moduleId?: number;
	children?: ApiTreeNode[];
	[key: string]: unknown;
}

function filterByModule(items: ApiTreeNode[], moduleId: number): ApiTreeNode[] {
	return items
		.map((item) => {
			if (item.children?.length) {
				const filtered = filterByModule(item.children, moduleId);
				if (filtered.length > 0) return { ...item, children: filtered };
			}
			if (item.moduleId === moduleId) return item;
			return null;
		})
		.filter((item): item is ApiTreeNode => item !== null);
}

function filterByName(items: ApiTreeNode[], search: string): ApiTreeNode[] {
	const lower = search.toLowerCase();
	return items
		.map((item) => {
			if (item.children?.length) {
				const filtered = filterByName(item.children, search);
				if (filtered.length > 0) return { ...item, children: filtered };
			}
			if ((item.name ?? "").toLowerCase().includes(lower)) return item;
			return null;
		})
		.filter((item): item is ApiTreeNode => item !== null);
}

export function registerReadTools(server: McpServer, client: ApidogClient): void {
	server.tool(
		"list_environments",
		"List all environments (DEV, TEST, PROD, etc.) with their base URLs",
		{},
		async () => {
			try {
				const data = await client.get(`/projects/${client.project}/environments`);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom("Failed to list environments", error);
			}
		},
	);

	server.tool(
		"list_api_endpoints",
		"List API endpoints tree with IDs, names, and folder structure. Use this to find apiDetailId values needed for creating test cases. Pass moduleId to filter by a specific service module (reduces response size significantly). Pass search to filter by endpoint name.",
		{
			moduleId: z.coerce
				.number()
				.optional()
				.describe("Filter by module ID (e.g. 950519 for tenancy-accounting). Greatly reduces response size."),
			search: z.string().optional().describe("Filter endpoints by name (case-insensitive substring match)"),
		},
		async ({ moduleId, search }) => {
			try {
				let data = await client.get<ApiTreeNode[]>(`/projects/${client.project}/api-tree-list`);

				if (moduleId !== undefined) {
					data = filterByModule(data, moduleId);
				}
				if (search) {
					data = filterByName(data, search);
				}

				return jsonResult(data);
			} catch (error) {
				return errorResultFrom("Failed to list API endpoints", error);
			}
		},
	);

	server.tool(
		"list_test_case_categories",
		"List test case categories (e.g. Positive, Negative, Edge Case)",
		{},
		async () => {
			try {
				const data = await client.get(`/projects/${client.project}/test-case-categories`);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom("Failed to list test case categories", error);
			}
		},
	);

	server.tool("list_test_case_tags", "List available test case tags for categorizing test cases", {}, async () => {
		try {
			const data = await client.get(`/projects/${client.project}/test-case-tags`);
			return jsonResult(data);
		} catch (error) {
			return errorResultFrom("Failed to list test case tags", error);
		}
	});

	server.tool("list_runners", "List available test runners (self-hosted agents for running tests)", {}, async () => {
		try {
			const data = await client.get(`/projects/${client.project}/runners`, {
				runnerType: "GENERAL",
				serverType: "SELF_HOSTED",
			});
			return jsonResult(data);
		} catch (error) {
			return errorResultFrom("Failed to list runners", error);
		}
	});

	server.tool("get_endpoint_statistics", "Get endpoint test coverage statistics", {}, async () => {
		try {
			const data = await client.get(`/projects/${client.project}/endpoint-statistics`);
			return jsonResult(data);
		} catch (error) {
			return errorResultFrom("Failed to get endpoint statistics", error);
		}
	});
}
