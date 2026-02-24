import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApidogClient } from "../client.js";
import { errorResultFrom, jsonResult } from "../types.js";

const columnSchema = z.record(
	z.object({
		generator: z
			.object({
				type: z.string().default("mock"),
				config: z
					.object({
						callee: z.string().default("$special.manual"),
						namedArgument: z.record(z.unknown()).optional(),
					})
					.default({}),
			})
			.default({}),
	}),
);

export function registerTestDataTools(server: McpServer, client: ApidogClient): void {
	server.tool(
		"list_test_data",
		"List test data records for a test case. Returns metadata (id, environmentId, relatedId) but not the actual data rows — use get_test_data for that.",
		{
			entityId: z.coerce.number().describe("The test case ID (relatedId) to list test data for"),
		},
		async ({ entityId }) => {
			try {
				const data = await client.get(`/projects/${client.project}/test-data`, {
					entityId: String(entityId),
				});
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to list test data for entity ${entityId}`, error);
			}
		},
	);

	server.tool(
		"get_test_data",
		"Get a specific test data record including the CSV data rows and column definitions.",
		{
			testDataId: z.coerce.number().describe("The test data record ID"),
		},
		async ({ testDataId }) => {
			try {
				const data = await client.get(`/projects/${client.project}/test-data/${testDataId}`);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to get test data ${testDataId}`, error);
			}
		},
	);

	server.tool(
		"create_test_data",
		"Create a test data record for a test case. The data field is CSV-formatted: first line is the column header, subsequent lines are values. Each column needs a matching entry in the columns object. Variables are accessible in test cases as {{columnName}} or via pm.iterationData.get('columnName') in scripts.",
		{
			relatedId: z.coerce.number().describe("The test case ID to attach this test data to"),
			environmentId: z.coerce
				.number()
				.default(0)
				.describe("Environment ID (0 = all environments, or a specific environment ID)"),
			data: z
				.string()
				.describe(
					"CSV-formatted data. First line is header (column name), subsequent lines are values. Example: 'contactId\\nid-1\\nid-2\\nid-3'",
				),
			columns: columnSchema.describe(
				"Column definitions. Keys must match the header names in the data field. Use {generator: {type: 'mock', config: {callee: '$special.manual'}}} for manually-entered data.",
			),
		},
		async ({ relatedId, environmentId, data, columns }) => {
			try {
				const body = {
					relatedId,
					dataSetId: 0,
					environmentId,
					data,
					columns,
					relatedType: 2,
				};
				const result = await client.post(`/projects/${client.project}/test-data`, body);
				return jsonResult(result);
			} catch (error) {
				return errorResultFrom("Failed to create test data", error);
			}
		},
	);

	server.tool(
		"update_test_data",
		"Update an existing test data record. Fetches current state first and merges changes.",
		{
			testDataId: z.coerce.number().describe("The test data record ID to update"),
			data: z.string().optional().describe("Updated CSV data (header + rows)"),
			columns: columnSchema.optional().describe("Updated column definitions"),
		},
		async ({ testDataId, ...fields }) => {
			try {
				const current = await client.get<Record<string, unknown>>(
					`/projects/${client.project}/test-data/${testDataId}`,
				);
				const body: Record<string, unknown> = {
					id: current.id,
					relatedId: current.relatedId,
					dataSetId: current.dataSetId,
					environmentId: current.environmentId,
					data: current.data,
					columns: current.columns,
				};
				for (const [k, v] of Object.entries(fields)) {
					if (v !== undefined) body[k] = v;
				}
				const result = await client.put(`/projects/${client.project}/test-data/${testDataId}`, body);
				return jsonResult(result);
			} catch (error) {
				return errorResultFrom(`Failed to update test data ${testDataId}`, error);
			}
		},
	);

	server.tool(
		"delete_test_data",
		"Delete a test data record by ID.",
		{
			testDataId: z.coerce.number().describe("The test data record ID to delete"),
		},
		async ({ testDataId }) => {
			try {
				const result = await client.delete(`/projects/${client.project}/test-data/${testDataId}`, { id: testDataId });
				return jsonResult(result);
			} catch (error) {
				return errorResultFrom(`Failed to delete test data ${testDataId}`, error);
			}
		},
	);
}
