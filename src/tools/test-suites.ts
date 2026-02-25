import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApidogClient } from "../client.js";
import { compactJsonResult, errorResultFrom, jsonResult } from "../types.js";

interface RawSuite {
	id: number;
	name: string;
	folderId?: number;
	priority?: number;
	tags?: string[];
	description?: string;
	ordering?: number;
	status?: string;
	[key: string]: unknown;
}

interface RawSuiteFolder {
	id: number;
	name: string;
	parentId?: number;
	[key: string]: unknown;
}

interface SuiteTreeListResponse {
	testSuites?: RawSuite[];
	testSuiteFolders?: RawSuiteFolder[];
	[key: string]: unknown;
}

const SUITE_FIELDS = ["id", "name", "folderId", "priority", "tags", "description", "ordering", "status"] as const;
const SUITE_FOLDER_FIELDS = ["id", "name", "parentId"] as const;

function pick<T extends Record<string, unknown>>(obj: T, fields: readonly string[]): Partial<T> {
	const result: Record<string, unknown> = {};
	for (const f of fields) {
		if (f in obj) result[f] = obj[f];
	}
	return result as Partial<T>;
}

interface SuiteItemStatic {
	type: "STATIC_TEST_CASE" | "STATIC_TEST_SCENARIO";
	name?: string;
	testCaseIds?: number[];
	testScenarioIds?: number[];
}

interface SuiteItemDynamic {
	type: "DYNAMIC_TEST_CASE" | "DYNAMIC_TEST_SCENARIO";
	name?: string;
	folderId?: number;
	priorities?: number[];
	tags?: string[];
}

type SuiteItemInput = SuiteItemStatic | SuiteItemDynamic;

function buildStructuredItem(item: SuiteItemInput) {
	const id = crypto.randomUUID();

	if (item.type === "STATIC_TEST_CASE") {
		return {
			id,
			name: item.name || "API Test Case",
			type: item.type,
			testCases: (item.testCaseIds ?? []).map((tcId) => ({ id: tcId, options: {} })),
		};
	}

	if (item.type === "STATIC_TEST_SCENARIO") {
		return {
			id,
			name: item.name || "Test Scenario",
			type: item.type,
			testScenarios: (item.testScenarioIds ?? []).map((tsId) => ({ id: tsId, options: {} })),
			options: {},
		};
	}

	const dynamic = item as SuiteItemDynamic;
	return {
		id,
		name: dynamic.name || "Test Scenario",
		type: dynamic.type,
		folderId: dynamic.folderId ?? 0,
		priorities: dynamic.priorities ?? [0, 1, 2, 3],
		tags: dynamic.tags ?? [],
		options: {},
	};
}

export function registerTestSuiteTools(server: McpServer, client: ApidogClient): void {
	server.tool(
		"list_test_suites",
		"List all test suites (compact summary: id, name, folderId, priority, tags, description, ordering, status). Use get_test_suite for full details.",
		{},
		async () => {
			try {
				const data = await client.get<SuiteTreeListResponse>(
					`/projects/${client.project}/api-test/test-suite-tree-list`,
				);
				const compact = {
					testSuites: (data.testSuites ?? []).map((s) => pick(s, SUITE_FIELDS)),
					testSuiteFolders: (data.testSuiteFolders ?? []).map((f) => pick(f, SUITE_FOLDER_FIELDS)),
				};
				return compactJsonResult(compact);
			} catch (error) {
				return errorResultFrom("Failed to list test suites", error);
			}
		},
	);

	server.tool(
		"get_test_suite",
		"Get full details of a test suite, including its items (test cases and scenarios).",
		{
			suiteId: z.coerce.number().describe("The test suite ID"),
		},
		async ({ suiteId }) => {
			try {
				const data = await client.get(`/projects/${client.project}/api-test/test-suites/${suiteId}`);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to get test suite ${suiteId}`, error);
			}
		},
	);

	server.tool(
		"create_test_suite",
		"Create a new test suite for CI grouping. Suites can contain test cases and test scenarios.",
		{
			name: z.string().describe("Suite name"),
			folderId: z.coerce.number().default(0).describe("Folder ID (0 for root)"),
			description: z.string().default("").describe("Suite description"),
			priority: z.coerce.number().default(2).describe("Priority (1=high, 2=medium, 3=low)"),
			tags: z.array(z.string()).default([]).describe("Tag names"),
			ordering: z.coerce.number().default(0).describe("Sort order"),
			environmentId: z.coerce.number().optional().describe("Default environment ID for running tests"),
			runnerId: z.coerce.number().default(0).describe("Default runner ID"),
		},
		async ({ name, folderId, description, priority, tags, ordering, environmentId, runnerId }) => {
			try {
				const body: Record<string, unknown> = {
					folderId,
					name,
					priority,
					tags,
					ordering,
					description,
					options: {
						runnerId,
						...(environmentId !== undefined ? { environmentId } : {}),
					},
				};
				const data = await client.post(`/projects/${client.project}/api-test/test-suites`, body);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom("Failed to create test suite", error);
			}
		},
	);

	server.tool(
		"update_test_suite_items",
		`Replace items in a test suite. Each item is a group with a UUID, a type, and a nested array of references.
For STATIC_TEST_CASE: provide testCaseIds (array of test case IDs).
For STATIC_TEST_SCENARIO: provide testScenarioIds (array of scenario IDs).
For DYNAMIC_TEST_CASE / DYNAMIC_TEST_SCENARIO: provide folderId to dynamically include all from that folder.
This does a GET-then-merge so existing suite fields are preserved.`,
		{
			suiteId: z.coerce.number().describe("The test suite ID"),
			items: z
				.array(
					z.object({
						type: z
							.enum(["STATIC_TEST_CASE", "STATIC_TEST_SCENARIO", "DYNAMIC_TEST_CASE", "DYNAMIC_TEST_SCENARIO"])
							.describe("Item group type"),
						name: z.string().default("").describe("Group display name"),
						testCaseIds: z.array(z.coerce.number()).optional().describe("For STATIC_TEST_CASE: array of test case IDs"),
						testScenarioIds: z
							.array(z.coerce.number())
							.optional()
							.describe("For STATIC_TEST_SCENARIO: array of scenario IDs"),
						folderId: z.coerce.number().optional().describe("For DYNAMIC types: folder ID to include all from"),
						priorities: z.array(z.coerce.number()).optional().describe("For DYNAMIC types: priority filter [0,1,2,3]"),
						tags: z.array(z.string()).optional().describe("For DYNAMIC types: tag filter"),
					}),
				)
				.describe("Item groups to set in the suite"),
		},
		async ({ suiteId, items }) => {
			try {
				const current = await client.get<Record<string, unknown>>(
					`/projects/${client.project}/api-test/test-suites/${suiteId}`,
				);
				const structuredItems = items.map((item) => buildStructuredItem(item as SuiteItemInput));
				const body = { ...current, items: structuredItems };
				const data = await client.put(`/projects/${client.project}/api-test/test-suites/${suiteId}`, body);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to update test suite items for ${suiteId}`, error);
			}
		},
	);

	server.tool(
		"delete_test_suite",
		"Delete a test suite by ID. This cannot be undone.",
		{
			suiteId: z.coerce.number().describe("The test suite ID to delete"),
		},
		async ({ suiteId }) => {
			try {
				const data = await client.delete(`/projects/${client.project}/api-test/test-suites/${suiteId}`, {
					id: suiteId,
				});
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to delete test suite ${suiteId}`, error);
			}
		},
	);
}
