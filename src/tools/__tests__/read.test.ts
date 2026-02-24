import { beforeEach, describe, expect, it } from "vitest";
import { type MockApidogClient, asClient, createMockClient, createMockServer } from "../../__tests__/helpers.js";
import { registerReadTools } from "../read.js";

describe("read tools", () => {
	let mockClient: MockApidogClient;
	let getHandler: ReturnType<typeof createMockServer>["getHandler"];
	let getToolNames: ReturnType<typeof createMockServer>["getToolNames"];

	beforeEach(() => {
		mockClient = createMockClient();
		const mock = createMockServer();
		registerReadTools(mock.server as never, asClient(mockClient));
		getHandler = mock.getHandler;
		getToolNames = mock.getToolNames;
	});

	it("registers all 6 read tools", () => {
		const names = getToolNames();
		expect(names).toEqual([
			"list_environments",
			"list_api_endpoints",
			"list_test_case_categories",
			"list_test_case_tags",
			"list_runners",
			"get_endpoint_statistics",
		]);
	});

	describe("list_environments", () => {
		it("calls the correct API path", async () => {
			mockClient.get.mockResolvedValueOnce([{ id: 1, name: "DEV" }]);

			const result = await getHandler("list_environments")({});

			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/environments");
			expect(result).toHaveProperty("content");
		});

		it("returns error result on failure", async () => {
			mockClient.get.mockRejectedValueOnce(new Error("network error"));

			const result = (await getHandler("list_environments")({})) as { isError?: boolean };

			expect(result.isError).toBe(true);
		});
	});

	describe("list_api_endpoints", () => {
		it("returns full tree when no filters", async () => {
			const tree = [{ name: "Users", moduleId: 100, children: [] }];
			mockClient.get.mockResolvedValueOnce(tree);

			const result = (await getHandler("list_api_endpoints")({})) as { content: Array<{ text: string }> };

			expect(JSON.parse(result.content[0].text)).toEqual(tree);
		});

		it("filters by moduleId", async () => {
			const tree = [
				{ name: "Module A", moduleId: 100, children: [] },
				{ name: "Module B", moduleId: 200, children: [] },
			];
			mockClient.get.mockResolvedValueOnce(tree);

			const result = (await getHandler("list_api_endpoints")({ moduleId: 200 })) as {
				content: Array<{ text: string }>;
			};
			const parsed = JSON.parse(result.content[0].text);

			expect(parsed).toHaveLength(1);
			expect(parsed[0].name).toBe("Module B");
		});

		it("filters by search", async () => {
			const tree = [
				{ name: "Get Users", moduleId: 100 },
				{ name: "Create Order", moduleId: 100 },
			];
			mockClient.get.mockResolvedValueOnce(tree);

			const result = (await getHandler("list_api_endpoints")({ search: "user" })) as {
				content: Array<{ text: string }>;
			};
			const parsed = JSON.parse(result.content[0].text);

			expect(parsed).toHaveLength(1);
			expect(parsed[0].name).toBe("Get Users");
		});

		it("filters nested children by moduleId", async () => {
			const tree = [
				{
					name: "Root",
					children: [
						{ name: "Child A", moduleId: 100 },
						{ name: "Child B", moduleId: 200 },
					],
				},
			];
			mockClient.get.mockResolvedValueOnce(tree);

			const result = (await getHandler("list_api_endpoints")({ moduleId: 100 })) as {
				content: Array<{ text: string }>;
			};
			const parsed = JSON.parse(result.content[0].text);

			expect(parsed).toHaveLength(1);
			expect(parsed[0].children).toHaveLength(1);
			expect(parsed[0].children[0].name).toBe("Child A");
		});
	});

	describe("list_test_case_categories", () => {
		it("calls the correct API path", async () => {
			mockClient.get.mockResolvedValueOnce([]);

			await getHandler("list_test_case_categories")({});

			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/test-case-categories");
		});
	});

	describe("list_test_case_tags", () => {
		it("calls the correct API path", async () => {
			mockClient.get.mockResolvedValueOnce([]);

			await getHandler("list_test_case_tags")({});

			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/test-case-tags");
		});
	});

	describe("list_runners", () => {
		it("passes runnerType and serverType params", async () => {
			mockClient.get.mockResolvedValueOnce([]);

			await getHandler("list_runners")({});

			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/runners", {
				runnerType: "GENERAL",
				serverType: "SELF_HOSTED",
			});
		});
	});

	describe("get_endpoint_statistics", () => {
		it("calls the correct API path", async () => {
			mockClient.get.mockResolvedValueOnce({});

			await getHandler("get_endpoint_statistics")({});

			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/endpoint-statistics");
		});
	});
});
