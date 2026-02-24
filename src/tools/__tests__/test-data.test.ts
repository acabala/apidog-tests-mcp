import { beforeEach, describe, expect, it } from "vitest";
import { type MockApidogClient, asClient, createMockClient, createMockServer } from "../../__tests__/helpers.js";
import { registerTestDataTools } from "../test-data.js";

describe("test-data tools", () => {
	let mockClient: MockApidogClient;
	let getHandler: ReturnType<typeof createMockServer>["getHandler"];
	let getToolNames: ReturnType<typeof createMockServer>["getToolNames"];

	beforeEach(() => {
		mockClient = createMockClient();
		const mock = createMockServer();
		registerTestDataTools(mock.server as never, asClient(mockClient));
		getHandler = mock.getHandler;
		getToolNames = mock.getToolNames;
	});

	it("registers all 5 test data tools", () => {
		const names = getToolNames();
		expect(names).toEqual([
			"list_test_data",
			"get_test_data",
			"create_test_data",
			"update_test_data",
			"delete_test_data",
		]);
	});

	describe("list_test_data", () => {
		it("passes entityId as string param", async () => {
			mockClient.get.mockResolvedValueOnce([]);

			await getHandler("list_test_data")({ entityId: 12345 });

			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/test-data", { entityId: "12345" });
		});

		it("returns error result on failure", async () => {
			mockClient.get.mockRejectedValueOnce(new Error("fail"));

			const result = (await getHandler("list_test_data")({ entityId: 1 })) as { isError?: boolean };

			expect(result.isError).toBe(true);
		});
	});

	describe("get_test_data", () => {
		it("fetches test data by ID", async () => {
			mockClient.get.mockResolvedValueOnce({ id: 99, data: "contactId\nid-1" });

			const result = (await getHandler("get_test_data")({ testDataId: 99 })) as {
				content: Array<{ text: string }>;
			};
			const parsed = JSON.parse(result.content[0].text);

			expect(parsed.data).toBe("contactId\nid-1");
			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/test-data/99");
		});
	});

	describe("create_test_data", () => {
		it("sends correct body with relatedType=2", async () => {
			mockClient.post.mockResolvedValueOnce({ id: 200 });

			await getHandler("create_test_data")({
				relatedId: 42,
				environmentId: 0,
				data: "contactId\nid-1\nid-2",
				columns: {
					contactId: {
						generator: {
							type: "mock",
							config: { callee: "$special.manual" },
						},
					},
				},
			});

			expect(mockClient.post).toHaveBeenCalledWith(
				"/projects/TEST_PROJECT/test-data",
				expect.objectContaining({
					relatedId: 42,
					dataSetId: 0,
					environmentId: 0,
					relatedType: 2,
					data: "contactId\nid-1\nid-2",
				}),
			);
		});
	});

	describe("update_test_data", () => {
		it("merges changes over current state", async () => {
			mockClient.get.mockResolvedValueOnce({
				id: 99,
				relatedId: 42,
				dataSetId: 0,
				environmentId: 0,
				data: "contactId\nold-id",
				columns: { contactId: {} },
			});
			mockClient.put.mockResolvedValueOnce({ id: 99 });

			await getHandler("update_test_data")({
				testDataId: 99,
				data: "contactId\nnew-id-1\nnew-id-2",
			});

			const putBody = mockClient.put.mock.calls[0][1] as Record<string, unknown>;
			expect(putBody.data).toBe("contactId\nnew-id-1\nnew-id-2");
			expect(putBody.relatedId).toBe(42);
		});

		it("preserves columns when only data is updated", async () => {
			const columns = { col: { generator: { type: "mock", config: { callee: "$special.manual" } } } };
			mockClient.get.mockResolvedValueOnce({
				id: 1,
				relatedId: 1,
				dataSetId: 0,
				environmentId: 0,
				data: "col\nval",
				columns,
			});
			mockClient.put.mockResolvedValueOnce({ id: 1 });

			await getHandler("update_test_data")({ testDataId: 1, data: "col\nnewval" });

			const putBody = mockClient.put.mock.calls[0][1] as Record<string, unknown>;
			expect(putBody.columns).toEqual(columns);
		});
	});

	describe("delete_test_data", () => {
		it("calls delete with body containing id", async () => {
			mockClient.delete.mockResolvedValueOnce(null);

			await getHandler("delete_test_data")({ testDataId: 99 });

			expect(mockClient.delete).toHaveBeenCalledWith("/projects/TEST_PROJECT/test-data/99", { id: 99 });
		});
	});
});
