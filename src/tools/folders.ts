import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApidogClient } from "../client.js";
import { errorResultFrom, jsonResult } from "../types.js";

export function registerFolderTools(server: McpServer, client: ApidogClient): void {
	server.tool(
		"create_scenario_folder",
		"Create a folder for organizing test scenarios. Folders can be nested via parentId.",
		{
			name: z.string().describe("Folder name"),
			parentId: z.coerce.number().default(0).describe("Parent folder ID (0 for root)"),
			ordering: z.coerce.number().default(0).describe("Sort order"),
		},
		async ({ name, parentId, ordering }) => {
			try {
				const data = await client.postForm("/api-test/case-folders", {
					parentId: String(parentId),
					name,
					ordering: String(ordering),
				});
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom("Failed to create scenario folder", error);
			}
		},
	);

	server.tool(
		"delete_scenario_folder",
		"Delete a test scenario folder by ID. The folder must be empty. This cannot be undone.",
		{
			folderId: z.coerce.number().describe("The folder ID to delete"),
		},
		async ({ folderId }) => {
			try {
				const data = await client.delete(`/api-test/case-folders/${folderId}`);
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom(`Failed to delete scenario folder ${folderId}`, error);
			}
		},
	);

	server.tool(
		"create_suite_folder",
		"Create a folder for organizing test suites. Folders can be nested via parentId.",
		{
			name: z.string().describe("Folder name"),
			parentId: z.coerce.number().default(0).describe("Parent folder ID (0 for root)"),
			ordering: z.coerce.number().default(0).describe("Sort order"),
		},
		async ({ name, parentId, ordering }) => {
			try {
				const data = await client.post(`/projects/${client.project}/api-test/test-suite-folders`, {
					parentId,
					name,
					ordering,
				});
				return jsonResult(data);
			} catch (error) {
				return errorResultFrom("Failed to create suite folder", error);
			}
		},
	);
}
