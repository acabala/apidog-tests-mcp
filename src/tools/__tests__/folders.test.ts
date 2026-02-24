import { beforeEach, describe, expect, it } from "vitest";
import { type MockApidogClient, asClient, createMockClient, createMockServer } from "../../__tests__/helpers.js";
import { registerFolderTools } from "../folders.js";

describe("folder tools", () => {
	let mockClient: MockApidogClient;
	let getHandler: ReturnType<typeof createMockServer>["getHandler"];
	let getToolNames: ReturnType<typeof createMockServer>["getToolNames"];

	beforeEach(() => {
		mockClient = createMockClient();
		const mock = createMockServer();
		registerFolderTools(mock.server as never, asClient(mockClient));
		getHandler = mock.getHandler;
		getToolNames = mock.getToolNames;
	});

	it("registers all 3 folder tools", () => {
		const names = getToolNames();
		expect(names).toEqual(["create_scenario_folder", "delete_scenario_folder", "create_suite_folder"]);
	});

	describe("create_scenario_folder", () => {
		it("sends form data via postForm", async () => {
			mockClient.postForm.mockResolvedValueOnce({ id: 10 });

			await getHandler("create_scenario_folder")({
				name: "My Folder",
				parentId: 0,
				ordering: 0,
			});

			expect(mockClient.postForm).toHaveBeenCalledWith("/api-test/case-folders", {
				parentId: "0",
				name: "My Folder",
				ordering: "0",
			});
		});

		it("converts parentId to string", async () => {
			mockClient.postForm.mockResolvedValueOnce({ id: 11 });

			await getHandler("create_scenario_folder")({
				name: "Nested",
				parentId: 42,
				ordering: 1,
			});

			const formData = mockClient.postForm.mock.calls[0][1] as Record<string, string>;
			expect(formData.parentId).toBe("42");
			expect(formData.ordering).toBe("1");
		});

		it("returns error result on failure", async () => {
			mockClient.postForm.mockRejectedValueOnce(new Error("fail"));

			const result = (await getHandler("create_scenario_folder")({
				name: "Fail",
				parentId: 0,
				ordering: 0,
			})) as { isError?: boolean };

			expect(result.isError).toBe(true);
		});
	});

	describe("delete_scenario_folder", () => {
		it("calls delete on the correct path", async () => {
			mockClient.delete.mockResolvedValueOnce(null);

			await getHandler("delete_scenario_folder")({ folderId: 55 });

			expect(mockClient.delete).toHaveBeenCalledWith("/api-test/case-folders/55");
		});
	});

	describe("create_suite_folder", () => {
		it("sends JSON body via post", async () => {
			mockClient.post.mockResolvedValueOnce({ id: 20 });

			await getHandler("create_suite_folder")({
				name: "Suite Folder",
				parentId: 0,
				ordering: 0,
			});

			expect(mockClient.post).toHaveBeenCalledWith("/projects/TEST_PROJECT/api-test/test-suite-folders", {
				parentId: 0,
				name: "Suite Folder",
				ordering: 0,
			});
		});
	});
});
