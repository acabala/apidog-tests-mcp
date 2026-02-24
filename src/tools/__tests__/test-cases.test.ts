import { beforeEach, describe, expect, it } from "vitest";
import { type MockApidogClient, asClient, createMockClient, createMockServer } from "../../__tests__/helpers.js";
import { registerTestCaseTools } from "../test-cases.js";

describe("test-cases tools", () => {
	let mockClient: MockApidogClient;
	let getHandler: ReturnType<typeof createMockServer>["getHandler"];
	let getToolNames: ReturnType<typeof createMockServer>["getToolNames"];

	beforeEach(() => {
		mockClient = createMockClient();
		const mock = createMockServer();
		registerTestCaseTools(mock.server as never, asClient(mockClient));
		getHandler = mock.getHandler;
		getToolNames = mock.getToolNames;
	});

	it("registers all 6 test case tools", () => {
		const names = getToolNames();
		expect(names).toEqual([
			"list_test_cases",
			"get_test_case",
			"create_test_case",
			"create_test_cases_bulk",
			"update_test_case",
			"delete_test_case",
		]);
	});

	describe("list_test_cases", () => {
		it("lists all test cases", async () => {
			const cases = [
				{ id: 1, name: "TC1", apiDetailId: 100 },
				{ id: 2, name: "TC2", apiDetailId: 200 },
			];
			mockClient.get.mockResolvedValueOnce(cases);

			const result = (await getHandler("list_test_cases")({})) as { content: Array<{ text: string }> };
			const parsed = JSON.parse(result.content[0].text);

			expect(parsed).toHaveLength(2);
			expect(mockClient.get).toHaveBeenCalledWith(
				"/projects/TEST_PROJECT/test-cases",
				expect.objectContaining({ fields: expect.any(String) }),
			);
		});

		it("filters by endpointId", async () => {
			const cases = [
				{ id: 1, name: "TC1", apiDetailId: 100 },
				{ id: 2, name: "TC2", apiDetailId: 200 },
			];
			mockClient.get.mockResolvedValueOnce(cases);

			const result = (await getHandler("list_test_cases")({ endpointId: 200 })) as {
				content: Array<{ text: string }>;
			};
			const parsed = JSON.parse(result.content[0].text);

			expect(parsed).toHaveLength(1);
			expect(parsed[0].id).toBe(2);
		});

		it("returns error result on failure", async () => {
			mockClient.get.mockRejectedValueOnce(new Error("fail"));

			const result = (await getHandler("list_test_cases")({})) as { isError?: boolean };

			expect(result.isError).toBe(true);
		});
	});

	describe("get_test_case", () => {
		it("fetches a test case by ID", async () => {
			mockClient.get.mockResolvedValueOnce({ id: 42, name: "My Test" });

			const result = (await getHandler("get_test_case")({ testCaseId: 42 })) as {
				content: Array<{ text: string }>;
			};
			const parsed = JSON.parse(result.content[0].text);

			expect(parsed.id).toBe(42);
			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/test-cases/42");
		});
	});

	describe("create_test_case", () => {
		it("sends correct body to API", async () => {
			mockClient.post.mockResolvedValueOnce({ id: 100 });

			await getHandler("create_test_case")({
				apiDetailId: 999,
				responseId: 1,
				name: "New Test",
				path: "/v1/test",
				categoryId: 1,
				tagIds: [],
				preProcessors: [],
				postProcessors: [],
				auth: {},
			});

			expect(mockClient.post).toHaveBeenCalledWith(
				"/projects/TEST_PROJECT/test-cases",
				expect.objectContaining({
					id: 0,
					type: "TEST_CASE",
					apiDetailId: 999,
					name: "New Test",
					path: "/v1/test",
				}),
			);
		});

		it("uses default parameters and requestBody when not provided", async () => {
			mockClient.post.mockResolvedValueOnce({ id: 100 });

			await getHandler("create_test_case")({
				apiDetailId: 999,
				responseId: 1,
				name: "Test",
				path: "/v1/test",
				categoryId: 1,
				tagIds: [],
				preProcessors: [],
				postProcessors: [],
				auth: {},
			});

			const body = mockClient.post.mock.calls[0][1] as Record<string, unknown>;
			expect(body.parameters).toEqual({ query: [], header: [], cookie: [], path: [] });
			expect(body.requestBody).toEqual({ parameters: [], type: "none", data: "" });
		});
	});

	describe("create_test_cases_bulk", () => {
		it("sends an array of test cases", async () => {
			mockClient.post.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

			await getHandler("create_test_cases_bulk")({
				testCases: [
					{
						apiDetailId: 100,
						responseId: 1,
						name: "TC1",
						path: "/v1/a",
						categoryId: 1,
						tagIds: [],
						preProcessors: [],
						postProcessors: [],
						auth: {},
					},
					{
						apiDetailId: 200,
						responseId: 2,
						name: "TC2",
						path: "/v1/b",
						categoryId: 1,
						tagIds: [],
						preProcessors: [],
						postProcessors: [],
						auth: {},
					},
				],
			});

			expect(mockClient.post).toHaveBeenCalledWith(
				"/projects/TEST_PROJECT/test-cases/bulk",
				expect.objectContaining({
					data: expect.arrayContaining([
						expect.objectContaining({ apiDetailId: 100, name: "TC1" }),
						expect.objectContaining({ apiDetailId: 200, name: "TC2" }),
					]),
				}),
			);
		});
	});

	describe("update_test_case", () => {
		it("merges changes over current state", async () => {
			mockClient.get.mockResolvedValueOnce({ id: 42, name: "Old Name", categoryId: 1 });
			mockClient.put.mockResolvedValueOnce({ id: 42, name: "New Name", categoryId: 1 });

			const result = (await getHandler("update_test_case")({
				testCaseId: 42,
				name: "New Name",
			})) as { content: Array<{ text: string }> };
			const parsed = JSON.parse(result.content[0].text);

			expect(parsed.name).toBe("New Name");
			const putBody = mockClient.put.mock.calls[0][1] as Record<string, unknown>;
			expect(putBody.name).toBe("New Name");
			expect(putBody.categoryId).toBe(1);
		});
	});

	describe("delete_test_case", () => {
		it("calls delete with body containing id", async () => {
			mockClient.delete.mockResolvedValueOnce(null);

			await getHandler("delete_test_case")({ testCaseId: 42 });

			expect(mockClient.delete).toHaveBeenCalledWith("/projects/TEST_PROJECT/test-cases/42", { id: 42 });
		});
	});
});
