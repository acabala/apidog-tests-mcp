import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApidogClient } from "../client.js";
import {
	DEFAULT_PARAMETERS,
	DEFAULT_REQUEST_BODY,
	authSchema,
	parametersSchema,
	processorsSchema,
	requestBodySchema,
} from "../schemas.js";
import { errorResultFrom, jsonResult } from "../types.js";

interface TestCase {
	apiDetailId?: number;
	[key: string]: unknown;
}

export function registerTestCaseTools(server: McpServer, client: ApidogClient): void {
	server.tool(
		"list_test_cases",
		"List all test cases. Optionally filter by endpoint (apiDetailId). Returns id, name, type, apiDetailId, categoryId, tagIds.",
		{
			endpointId: z.coerce.number().optional().describe("Filter by API endpoint ID (apiDetailId)"),
		},
		async ({ endpointId }) => {
			try {
				const params: Record<string, string> = {
					fields: "id,name,type,apiDetailId,moduleId,projectId,categoryId,tagIds",
				};
				const data = await client.get<TestCase[]>(`/projects/${client.project}/test-cases`, params);

				if (endpointId !== undefined) {
					return jsonResult(data.filter((tc) => tc.apiDetailId === endpointId));
				}
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom("Failed to list test cases", error);
			}
		},
	);

	server.tool(
		"get_test_case",
		"Get full details of a single test case by its ID, including parameters, request body, and assertions",
		{
			testCaseId: z.coerce.number().describe("The test case ID"),
		},
		async ({ testCaseId }) => {
			try {
				const data = await client.get(`/projects/${client.project}/test-cases/${testCaseId}`);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to get test case ${testCaseId}`, error);
			}
		},
	);

	server.tool(
		"create_test_case",
		"Create a test case for an API endpoint. Requires apiDetailId (from list_api_endpoints) and responseId. Use list_test_case_categories and list_test_case_tags first to get valid categoryId and tagIds.",
		{
			apiDetailId: z.coerce.number().describe("The API endpoint ID to create a test case for"),
			responseId: z.coerce.number().describe("The response definition ID for this endpoint"),
			name: z.string().describe("Test case name"),
			path: z.string().describe("API path (e.g. /v2/organisations/{organisationId}/users)"),
			categoryId: z.coerce.number().default(1).describe("Test case category ID"),
			tagIds: z.array(z.coerce.number()).default([]).describe("Tag IDs to apply"),
			parameters: parametersSchema,
			requestBody: requestBodySchema,
			preProcessors: processorsSchema.describe("Pre-processors / pre-request scripts"),
			postProcessors: processorsSchema.describe("Post-processors / assertions"),
			auth: authSchema,
		},
		async ({
			apiDetailId,
			responseId,
			name,
			path,
			categoryId,
			tagIds,
			parameters,
			requestBody,
			preProcessors,
			postProcessors,
			auth,
		}) => {
			try {
				const body = {
					id: 0,
					type: "TEST_CASE",
					apiDetailId,
					responseId,
					name,
					path,
					categoryId,
					tagIds,
					parameters: parameters ?? DEFAULT_PARAMETERS,
					requestBody: requestBody ?? DEFAULT_REQUEST_BODY,
					preProcessors,
					postProcessors,
					auth,
				};
				const data = await client.post(`/projects/${client.project}/test-cases`, body);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom("Failed to create test case", error);
			}
		},
	);

	server.tool(
		"create_test_cases_bulk",
		"Create multiple test cases at once. Each item follows the same schema as create_test_case.",
		{
			testCases: z
				.array(
					z.object({
						apiDetailId: z.coerce.number(),
						responseId: z.coerce.number(),
						name: z.string(),
						path: z.string(),
						categoryId: z.coerce.number().default(1),
						tagIds: z.array(z.coerce.number()).default([]),
						parameters: parametersSchema,
						requestBody: requestBodySchema,
						preProcessors: processorsSchema,
						postProcessors: processorsSchema,
						auth: authSchema,
					}),
				)
				.describe("Array of test case objects to create"),
		},
		async ({ testCases }) => {
			try {
				const payload = testCases.map((tc) => ({
					id: 0,
					type: "TEST_CASE",
					apiDetailId: tc.apiDetailId,
					responseId: tc.responseId,
					name: tc.name,
					path: tc.path,
					categoryId: tc.categoryId,
					tagIds: tc.tagIds,
					parameters: tc.parameters ?? DEFAULT_PARAMETERS,
					requestBody: tc.requestBody ?? DEFAULT_REQUEST_BODY,
					preProcessors: tc.preProcessors,
					postProcessors: tc.postProcessors,
					auth: tc.auth,
				}));
				const data = await client.post(`/projects/${client.project}/test-cases/bulk`, { data: payload });
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom("Failed to create test cases in bulk", error);
			}
		},
	);

	server.tool(
		"update_test_case",
		"Update an existing test case. Pass only the fields you want to change. The tool fetches the current state first and merges your changes, so unspecified fields are preserved.",
		{
			testCaseId: z.coerce.number().describe("The test case ID to update"),
			name: z.string().optional().describe("New name"),
			categoryId: z.coerce.number().optional().describe("New category ID"),
			tagIds: z.array(z.coerce.number()).optional().describe("New tag IDs"),
			parameters: parametersSchema.describe("Updated parameters"),
			requestBody: requestBodySchema.describe("Updated request body"),
			preProcessors: processorsSchema.optional().describe("Updated pre-processors / pre-request scripts"),
			postProcessors: processorsSchema.optional().describe("Updated assertions / post-processors"),
			auth: z.record(z.unknown()).optional().describe("Updated auth config"),
		},
		async ({ testCaseId, ...fields }) => {
			try {
				const current = await client.get<Record<string, unknown>>(
					`/projects/${client.project}/test-cases/${testCaseId}`,
				);
				const body: Record<string, unknown> = { ...current };
				for (const [k, v] of Object.entries(fields)) {
					if (v !== undefined) body[k] = v;
				}
				const data = await client.put(`/projects/${client.project}/test-cases/${testCaseId}`, body);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to update test case ${testCaseId}`, error);
			}
		},
	);

	server.tool(
		"delete_test_case",
		"Delete a test case by ID. This cannot be undone.",
		{
			testCaseId: z.coerce.number().describe("The test case ID to delete"),
		},
		async ({ testCaseId }) => {
			try {
				const data = await client.delete(`/projects/${client.project}/test-cases/${testCaseId}`, { id: testCaseId });
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to delete test case ${testCaseId}`, error);
			}
		},
	);
}
