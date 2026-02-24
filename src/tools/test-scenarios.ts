import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApidogClient } from "../client.js";
import { authSchema, parametersSchema, processorsSchema, requestBodySchema } from "../schemas.js";
import { errorResultFrom, jsonResult } from "../types.js";

export function registerTestScenarioTools(server: McpServer, client: ApidogClient): void {
	server.tool(
		"list_test_scenarios",
		"List all test scenarios with folder tree structure. Returns testScenarios and testScenarioFolders.",
		{},
		async () => {
			try {
				const data = await client.get(`/projects/${client.project}/test-scenario/tree-list`);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom("Failed to list test scenarios", error);
			}
		},
	);

	server.tool(
		"get_test_scenario_steps",
		"Get the steps (API calls) for a test scenario. Each step contains the full httpApiCase with parameters, auth, and request details.",
		{
			scenarioId: z.coerce.number().describe("The test scenario ID"),
		},
		async ({ scenarioId }) => {
			try {
				const data = await client.get(`/api-test/cases/${scenarioId}/steps`);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to get test scenario steps for ${scenarioId}`, error);
			}
		},
	);

	server.tool(
		"create_test_scenario",
		"Create a new test scenario (multi-step test flow). Use list_test_scenarios first to find valid folderIds and determine ordering.",
		{
			name: z.string().describe("Scenario name"),
			folderId: z.coerce.number().describe("Folder ID to place the scenario in"),
			description: z.string().default("").describe("Scenario description"),
			priority: z.coerce.number().default(2).describe("Priority (1=high, 2=medium, 3=low)"),
			tags: z.array(z.string()).default([]).describe("Tag names to apply"),
			ordering: z.coerce.number().default(0).describe("Sort order within folder"),
			options: z
				.object({
					useDataSetId: z.coerce.number().default(-1),
					threadCount: z.coerce.number().default(1),
					iterationCount: z.coerce.number().default(1),
					delayItem: z.coerce.number().default(0),
					saveVariables: z.boolean().default(true),
					saveReportDetail: z.string().default("all"),
					readGlobalCookie: z.boolean().default(false),
					saveGlobalCookie: z.boolean().default(false),
					onError: z.string().default("ignore"),
					runnerId: z.coerce.number().default(0),
				})
				.optional()
				.describe("Execution options"),
		},
		async ({ name, folderId, description, priority, tags, ordering, options }) => {
			try {
				const defaultOptions = {
					useDataSetId: -1,
					threadCount: 1,
					iterationCount: 1,
					delayItem: 0,
					saveVariables: true,
					saveReportDetail: "all",
					readGlobalCookie: false,
					saveGlobalCookie: false,
					onError: "ignore",
					runnerId: 0,
				};
				const body = {
					folderId,
					name,
					priority,
					tags,
					ordering,
					description,
					options: options ?? defaultOptions,
				};
				const data = await client.post("/api-test/cases", body);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom("Failed to create test scenario", error);
			}
		},
	);

	server.tool(
		"update_test_scenario_steps",
		"Set or update the steps in a test scenario. Each step references an API endpoint via bindId (apiDetailId). Steps are fully replaced — pass the complete steps array.",
		{
			scenarioId: z.coerce.number().describe("The test scenario ID"),
			steps: z
				.array(
					z.object({
						id: z.string().describe("Unique step ID (UUID)"),
						type: z.string().default("http").describe("Step type (usually 'http')"),
						disable: z.boolean().default(false),
						parameters: z.record(z.unknown()).default({}),
						name: z.string().describe("Step name (e.g. API endpoint name)"),
						bindId: z.coerce.number().describe("API endpoint ID (apiDetailId)"),
						bindType: z.string().default("API"),
						syncMode: z.string().default("MANUAL"),
						httpApiCase: z
							.object({
								type: z.string().default("DEBUG_CASE"),
								method: z.string().describe("HTTP method (get, post, put, delete)"),
								name: z.string().default(""),
								testSuiteId: z.coerce.number().describe("The scenario ID this step belongs to"),
								apiDetailId: z.coerce.number().describe("API endpoint ID"),
								parameters: parametersSchema,
								requestBody: requestBodySchema,
								responseId: z.string().describe("Response definition ID (as string)"),
								projectId: z.coerce.number().describe("Project ID"),
								moduleId: z.coerce.number().describe("Module/folder ID of the API"),
								auth: authSchema,
								path: z.string().describe("API path"),
								preProcessors: processorsSchema,
								postProcessors: processorsSchema,
							})
							.describe("Full HTTP request configuration for this step"),
					}),
				)
				.describe("Complete array of steps to set on the scenario"),
		},
		async ({ scenarioId, steps }) => {
			try {
				const body = { id: scenarioId, steps };
				const data = await client.put(`/api-test/cases/${scenarioId}`, body);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to update test scenario steps for ${scenarioId}`, error);
			}
		},
	);

	server.tool(
		"delete_test_scenario",
		"Delete a test scenario by ID. This cannot be undone.",
		{
			scenarioId: z.coerce.number().describe("The test scenario ID to delete"),
		},
		async ({ scenarioId }) => {
			try {
				const data = await client.delete(`/projects/${client.project}/test-scenario/${scenarioId}`, { id: scenarioId });
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to delete test scenario ${scenarioId}`, error);
			}
		},
	);
}
