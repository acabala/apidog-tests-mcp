import { beforeEach, describe, expect, it } from "vitest";
import { type MockApidogClient, asClient, createMockClient, createMockServer } from "../../__tests__/helpers.js";
import { registerTestScenarioTools } from "../test-scenarios.js";

describe("test-scenarios tools", () => {
	let mockClient: MockApidogClient;
	let getHandler: ReturnType<typeof createMockServer>["getHandler"];
	let getToolNames: ReturnType<typeof createMockServer>["getToolNames"];

	beforeEach(() => {
		mockClient = createMockClient();
		const mock = createMockServer();
		registerTestScenarioTools(mock.server as never, asClient(mockClient));
		getHandler = mock.getHandler;
		getToolNames = mock.getToolNames;
	});

	it("registers all 5 scenario tools", () => {
		const names = getToolNames();
		expect(names).toEqual([
			"list_test_scenarios",
			"get_test_scenario_steps",
			"create_test_scenario",
			"update_test_scenario_steps",
			"delete_test_scenario",
		]);
	});

	describe("list_test_scenarios", () => {
		it("calls the correct API path", async () => {
			mockClient.get.mockResolvedValueOnce({ testScenarios: [], testScenarioFolders: [] });

			await getHandler("list_test_scenarios")({});

			expect(mockClient.get).toHaveBeenCalledWith("/projects/TEST_PROJECT/test-scenario/tree-list");
		});

		it("returns only essential fields in compact JSON", async () => {
			mockClient.get.mockResolvedValueOnce({
				testScenarios: [
					{
						id: 1,
						name: "Login Flow",
						folderId: 10,
						priority: 1,
						tags: ["smoke"],
						description: "Test login",
						ordering: 0,
						status: "active",
						options: { threadCount: 5, iterationCount: 10, delayItem: 100 },
						createdAt: "2025-01-01",
						updatedAt: "2025-01-02",
						createdBy: { id: 999, name: "User" },
						extraField: "should be stripped",
					},
				],
				testScenarioFolders: [
					{
						id: 10,
						name: "Auth",
						parentId: 0,
						createdAt: "2025-01-01",
						extraField: "should be stripped",
					},
				],
			});

			const result = (await getHandler("list_test_scenarios")({})) as {
				content: Array<{ text: string }>;
			};
			const parsed = JSON.parse(result.content[0].text);

			expect(parsed.testScenarios).toEqual([
				{
					id: 1,
					name: "Login Flow",
					folderId: 10,
					priority: 1,
					tags: ["smoke"],
					description: "Test login",
					ordering: 0,
					status: "active",
				},
			]);
			expect(parsed.testScenarioFolders).toEqual([{ id: 10, name: "Auth", parentId: 0 }]);
			expect(result.content[0].text).not.toContain("extraField");
			expect(result.content[0].text).not.toContain("options");
			expect(result.content[0].text).not.toContain("\n");
		});

		it("returns error result on failure", async () => {
			mockClient.get.mockRejectedValueOnce(new Error("fail"));

			const result = (await getHandler("list_test_scenarios")({})) as { isError?: boolean };

			expect(result.isError).toBe(true);
		});
	});

	describe("get_test_scenario_steps", () => {
		it("fetches steps for a scenario", async () => {
			const steps = [{ id: "step-1", type: "http" }];
			mockClient.get.mockResolvedValueOnce(steps);

			const result = (await getHandler("get_test_scenario_steps")({ scenarioId: 500 })) as {
				content: Array<{ text: string }>;
			};
			const parsed = JSON.parse(result.content[0].text);

			expect(parsed).toEqual(steps);
			expect(mockClient.get).toHaveBeenCalledWith("/api-test/cases/500/steps");
		});
	});

	describe("create_test_scenario", () => {
		it("sends correct body with defaults", async () => {
			mockClient.post.mockResolvedValueOnce({ id: 600 });

			await getHandler("create_test_scenario")({
				name: "My Scenario",
				folderId: 10,
				description: "",
				priority: 2,
				tags: [],
				ordering: 0,
			});

			expect(mockClient.post).toHaveBeenCalledWith(
				"/api-test/cases",
				expect.objectContaining({
					name: "My Scenario",
					folderId: 10,
					options: expect.objectContaining({ threadCount: 1, iterationCount: 1 }),
				}),
			);
		});

		it("accepts custom options", async () => {
			mockClient.post.mockResolvedValueOnce({ id: 601 });

			await getHandler("create_test_scenario")({
				name: "Custom",
				folderId: 10,
				description: "",
				priority: 1,
				tags: ["smoke"],
				ordering: 1,
				options: {
					useDataSetId: -1,
					threadCount: 5,
					iterationCount: 10,
					delayItem: 100,
					saveVariables: true,
					saveReportDetail: "all",
					readGlobalCookie: false,
					saveGlobalCookie: false,
					onError: "stop",
					runnerId: 0,
				},
			});

			const body = mockClient.post.mock.calls[0][1] as Record<string, Record<string, unknown>>;
			expect(body.options.threadCount).toBe(5);
			expect(body.options.onError).toBe("stop");
		});
	});

	describe("update_test_scenario_steps", () => {
		it("sends steps to the correct endpoint", async () => {
			mockClient.put.mockResolvedValueOnce({ id: 500 });

			const steps = [
				{
					id: "step-uuid-1",
					type: "http",
					disable: false,
					parameters: {},
					name: "Get Users",
					bindId: 999,
					bindType: "API",
					syncMode: "MANUAL",
					httpApiCase: {
						type: "DEBUG_CASE",
						method: "get",
						name: "",
						testSuiteId: 500,
						apiDetailId: 999,
						responseId: "123",
						projectId: 1107740,
						moduleId: 943349,
						auth: {},
						path: "/v2/organisations/{organisationId}",
						preProcessors: [],
						postProcessors: [],
					},
				},
			];

			await getHandler("update_test_scenario_steps")({ scenarioId: 500, steps });

			expect(mockClient.put).toHaveBeenCalledWith("/api-test/cases/500", expect.objectContaining({ id: 500, steps }));
		});
	});

	describe("delete_test_scenario", () => {
		it("calls delete with body containing id", async () => {
			mockClient.delete.mockResolvedValueOnce(null);

			await getHandler("delete_test_scenario")({ scenarioId: 500 });

			expect(mockClient.delete).toHaveBeenCalledWith("/projects/TEST_PROJECT/test-scenario/500", { id: 500 });
		});
	});
});
