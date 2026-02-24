import { beforeEach, describe, expect, it } from "vitest";
import { type MockApidogClient, asClient, createMockClient, createMockServer } from "../../__tests__/helpers.js";
import { registerTestSuiteTools } from "../test-suites.js";

describe("test-suites tools", () => {
	let mockClient: MockApidogClient;
	let getHandler: ReturnType<typeof createMockServer>["getHandler"];
	let getToolNames: ReturnType<typeof createMockServer>["getToolNames"];

	beforeEach(() => {
		mockClient = createMockClient();
		const mock = createMockServer();
		registerTestSuiteTools(mock.server as never, asClient(mockClient));
		getHandler = mock.getHandler;
		getToolNames = mock.getToolNames;
	});

	it("registers all 5 suite tools", () => {
		const names = getToolNames();
		expect(names).toEqual([
			"list_test_suites",
			"get_test_suite",
			"create_test_suite",
			"update_test_suite_items",
			"delete_test_suite",
		]);
	});

	describe("list_test_suites", () => {
		it("calls the correct API path", async () => {
			mockClient.get.mockResolvedValueOnce([]);

			await getHandler("list_test_suites")({});

			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/api-test/test-suite-tree-list");
		});

		it("returns error result on failure", async () => {
			mockClient.get.mockRejectedValueOnce(new Error("fail"));

			const result = (await getHandler("list_test_suites")({})) as { isError?: boolean };

			expect(result.isError).toBe(true);
		});
	});

	describe("get_test_suite", () => {
		it("fetches suite by ID", async () => {
			mockClient.get.mockResolvedValueOnce({ id: 765, name: "Smoke Tests" });

			const result = (await getHandler("get_test_suite")({ suiteId: 765 })) as {
				content: Array<{ text: string }>;
			};
			const parsed = JSON.parse(result.content[0].text);

			expect(parsed.name).toBe("Smoke Tests");
			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/api-test/test-suites/765");
		});
	});

	describe("create_test_suite", () => {
		it("sends correct body", async () => {
			mockClient.post.mockResolvedValueOnce({ id: 800 });

			await getHandler("create_test_suite")({
				name: "Regression",
				folderId: 0,
				description: "Full regression suite",
				priority: 1,
				tags: ["regression"],
				ordering: 0,
				runnerId: 0,
			});

			expect(mockClient.post).toHaveBeenCalledWith(
				"/projects/TEST_PROJECT/api-test/test-suites",
				expect.objectContaining({
					name: "Regression",
					description: "Full regression suite",
					priority: 1,
				}),
			);
		});

		it("includes environmentId in options when provided", async () => {
			mockClient.post.mockResolvedValueOnce({ id: 801 });

			await getHandler("create_test_suite")({
				name: "Suite",
				folderId: 0,
				description: "",
				priority: 2,
				tags: [],
				ordering: 0,
				environmentId: 5053315,
				runnerId: 0,
			});

			const body = mockClient.post.mock.calls[0][1] as Record<string, Record<string, unknown>>;
			expect(body.options.environmentId).toBe(5053315);
		});
	});

	describe("update_test_suite_items", () => {
		it("merges items with current suite state", async () => {
			mockClient.get.mockResolvedValueOnce({ id: 765, name: "Smoke", description: "desc" });
			mockClient.put.mockResolvedValueOnce({ id: 765 });

			await getHandler("update_test_suite_items")({
				suiteId: 765,
				items: [
					{
						type: "STATIC_TEST_CASE",
						name: "Cases",
						testCaseIds: [100, 200],
					},
				],
			});

			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/api-test/test-suites/765");
			const putBody = mockClient.put.mock.calls[0][1] as Record<string, unknown>;
			expect(putBody.name).toBe("Smoke");
			expect(putBody.description).toBe("desc");
			const items = putBody.items as Array<Record<string, unknown>>;
			expect(items).toHaveLength(1);
			expect(items[0].type).toBe("STATIC_TEST_CASE");
			expect(items[0].id).toBeDefined();
		});

		it("builds STATIC_TEST_CASE items correctly", async () => {
			mockClient.get.mockResolvedValueOnce({ id: 1 });
			mockClient.put.mockResolvedValueOnce({ id: 1 });

			await getHandler("update_test_suite_items")({
				suiteId: 1,
				items: [{ type: "STATIC_TEST_CASE", name: "Cases", testCaseIds: [10, 20] }],
			});

			const items = (mockClient.put.mock.calls[0][1] as Record<string, unknown>).items as Array<
				Record<string, unknown>
			>;
			const item = items[0] as { testCases: Array<{ id: number; options: unknown }> };
			expect(item.testCases).toEqual([
				{ id: 10, options: {} },
				{ id: 20, options: {} },
			]);
		});

		it("builds STATIC_TEST_SCENARIO items correctly", async () => {
			mockClient.get.mockResolvedValueOnce({ id: 1 });
			mockClient.put.mockResolvedValueOnce({ id: 1 });

			await getHandler("update_test_suite_items")({
				suiteId: 1,
				items: [{ type: "STATIC_TEST_SCENARIO", name: "Scenarios", testScenarioIds: [30] }],
			});

			const items = (mockClient.put.mock.calls[0][1] as Record<string, unknown>).items as Array<
				Record<string, unknown>
			>;
			const item = items[0] as { testScenarios: Array<{ id: number; options: unknown }> };
			expect(item.testScenarios).toEqual([{ id: 30, options: {} }]);
		});

		it("builds DYNAMIC items correctly", async () => {
			mockClient.get.mockResolvedValueOnce({ id: 1 });
			mockClient.put.mockResolvedValueOnce({ id: 1 });

			await getHandler("update_test_suite_items")({
				suiteId: 1,
				items: [{ type: "DYNAMIC_TEST_CASE", name: "Dynamic", folderId: 50 }],
			});

			const items = (mockClient.put.mock.calls[0][1] as Record<string, unknown>).items as Array<
				Record<string, unknown>
			>;
			expect(items[0].type).toBe("DYNAMIC_TEST_CASE");
			expect(items[0].folderId).toBe(50);
			expect(items[0].priorities).toEqual([0, 1, 2, 3]);
		});
	});

	describe("delete_test_suite", () => {
		it("calls delete with body containing id", async () => {
			mockClient.delete.mockResolvedValueOnce(null);

			await getHandler("delete_test_suite")({ suiteId: 765 });

			expect(mockClient.delete).toHaveBeenCalledWith("/projects/TEST_PROJECT/api-test/test-suites/765", {
				id: 765,
			});
		});
	});
});
