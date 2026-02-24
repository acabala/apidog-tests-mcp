import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApidogClient } from "../client.js";
import { ApidogApiError, ApidogConfigError } from "../errors.js";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function makeClient(overrides?: Partial<ConstructorParameters<typeof ApidogClient>[0]>) {
	return new ApidogClient({
		accessToken: "test-token",
		projectId: "12345",
		branchId: "main",
		deviceId: "device-1",
		...overrides,
	});
}

function jsonResponse(data: unknown, status = 200) {
	return new Response(JSON.stringify({ success: true, data }), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

function errorResponse(body: string, status: number) {
	return new Response(body, { status });
}

describe("ApidogClient", () => {
	beforeEach(() => {
		mockFetch.mockReset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("constructor", () => {
		it("uses the default base URL when none is provided", () => {
			const client = makeClient();

			expect(client.project).toBe("12345");
		});

		it("accepts a custom base URL", () => {
			const client = makeClient({ baseUrl: "https://custom.api.com/v1" });
			mockFetch.mockResolvedValueOnce(jsonResponse([]));

			client.get("/test");

			expect(mockFetch).toHaveBeenCalledWith(
				expect.stringContaining("https://custom.api.com/v1/test"),
				expect.anything(),
			);
		});
	});

	describe("fromEnv", () => {
		it("creates a client from environment variables", () => {
			const original = { ...process.env };
			process.env.APIDOG_ACCESS_TOKEN = "env-token";
			process.env.APIDOG_PROJECT_ID = "env-project";
			process.env.APIDOG_BRANCH_ID = "env-branch";
			process.env.APIDOG_DEVICE_ID = "env-device";

			try {
				const client = ApidogClient.fromEnv();
				expect(client.project).toBe("env-project");
			} finally {
				process.env = original;
			}
		});

		it("throws ApidogConfigError when env var is missing", () => {
			const original = { ...process.env };
			process.env.APIDOG_ACCESS_TOKEN = undefined;
			process.env.APIDOG_PROJECT_ID = undefined;
			process.env.APIDOG_BRANCH_ID = undefined;
			process.env.APIDOG_DEVICE_ID = undefined;

			try {
				expect(() => ApidogClient.fromEnv()).toThrow(ApidogConfigError);
			} finally {
				process.env = original;
			}
		});
	});

	describe("URL building", () => {
		it("includes locale parameter by default", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse(null));
			const client = makeClient();

			await client.get("/some/path");

			const calledUrl = mockFetch.mock.calls[0][0] as string;
			expect(calledUrl).toContain("locale=en-US");
		});

		it("appends query params", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse(null));
			const client = makeClient();

			await client.get("/path", { foo: "bar", baz: "qux" });

			const calledUrl = mockFetch.mock.calls[0][0] as string;
			expect(calledUrl).toContain("foo=bar");
			expect(calledUrl).toContain("baz=qux");
		});
	});

	describe("headers", () => {
		it("sends correct authorization and project headers", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse(null));
			const client = makeClient();

			await client.get("/test");

			const opts = mockFetch.mock.calls[0][1] as RequestInit;
			const headers = opts.headers as Record<string, string>;
			expect(headers.Authorization).toBe("Bearer test-token");
			expect(headers["x-project-id"]).toBe("12345");
			expect(headers["x-branch-id"]).toBe("main");
			expect(headers["x-device-id"]).toBe("device-1");
			expect(headers["Content-Type"]).toBe("application/json");
		});
	});

	describe("get", () => {
		it("returns response data on success", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse({ id: 1, name: "test" }));
			const client = makeClient();

			const result = await client.get("/test");

			expect(result).toEqual({ id: 1, name: "test" });
		});

		it("sends GET method with no body", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse(null));
			const client = makeClient();

			await client.get("/test");

			const opts = mockFetch.mock.calls[0][1] as RequestInit;
			expect(opts.method).toBe("GET");
			expect(opts.body).toBeUndefined();
		});
	});

	describe("post", () => {
		it("sends POST with JSON body", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse({ id: 99 }));
			const client = makeClient();

			const result = await client.post("/items", { name: "new" });

			expect(result).toEqual({ id: 99 });
			const opts = mockFetch.mock.calls[0][1] as RequestInit;
			expect(opts.method).toBe("POST");
			expect(opts.body).toBe('{"name":"new"}');
		});
	});

	describe("put", () => {
		it("sends PUT with JSON body", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse({ updated: true }));
			const client = makeClient();

			const result = await client.put("/items/1", { name: "updated" });

			expect(result).toEqual({ updated: true });
			const opts = mockFetch.mock.calls[0][1] as RequestInit;
			expect(opts.method).toBe("PUT");
		});
	});

	describe("delete", () => {
		it("sends DELETE with body", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse(null));
			const client = makeClient();

			await client.delete("/items/1", { id: 1 });

			const opts = mockFetch.mock.calls[0][1] as RequestInit;
			expect(opts.method).toBe("DELETE");
			expect(opts.body).toBe('{"id":1}');
		});

		it("sends DELETE without body", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse(null));
			const client = makeClient();

			await client.delete("/items/1");

			const opts = mockFetch.mock.calls[0][1] as RequestInit;
			expect(opts.body).toBeUndefined();
		});
	});

	describe("postForm", () => {
		it("sends form-urlencoded body", async () => {
			mockFetch.mockResolvedValueOnce(jsonResponse({ created: true }));
			const client = makeClient();

			const result = await client.postForm("/forms", { key: "value" });

			expect(result).toEqual({ created: true });
			const opts = mockFetch.mock.calls[0][1] as RequestInit;
			expect(opts.method).toBe("POST");
			const headers = opts.headers as Record<string, string>;
			expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
			expect(opts.body).toBe("key=value");
		});
	});

	describe("error handling", () => {
		it("throws ApidogApiError on non-OK response", async () => {
			mockFetch.mockResolvedValueOnce(errorResponse("Not Found", 404));
			const client = makeClient();

			await expect(client.get("/missing")).rejects.toThrow(ApidogApiError);
			await expect(
				(async () => {
					mockFetch.mockResolvedValueOnce(errorResponse("Not Found", 404));
					return client.get("/missing");
				})(),
			).rejects.toMatchObject({
				method: "GET",
				path: "/missing",
				statusCode: 404,
			});
		});

		it("throws ApidogApiError when success=false", async () => {
			mockFetch.mockResolvedValueOnce(
				new Response(JSON.stringify({ success: false, error: "Bad request" }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);
			const client = makeClient();

			await expect(client.post("/bad", {})).rejects.toThrow(ApidogApiError);
		});

		it("includes method and path in ApidogApiError", async () => {
			mockFetch.mockResolvedValueOnce(errorResponse("Server Error", 500));
			const client = makeClient();

			try {
				await client.put("/resource/1", {});
				expect.fail("Should have thrown");
			} catch (e) {
				expect(e).toBeInstanceOf(ApidogApiError);
				const err = e as ApidogApiError;
				expect(err.method).toBe("PUT");
				expect(err.path).toBe("/resource/1");
				expect(err.statusCode).toBe(500);
				expect(err.responseBody).toBe("Server Error");
			}
		});

		it("throws ApidogApiError on postForm non-OK response", async () => {
			mockFetch.mockResolvedValueOnce(errorResponse("Forbidden", 403));
			const client = makeClient();

			await expect(client.postForm("/forms", { a: "b" })).rejects.toThrow(ApidogApiError);
		});
	});

	describe("response parsing", () => {
		it("returns data field when present", async () => {
			mockFetch.mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true, data: [1, 2, 3] }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);
			const client = makeClient();

			const result = await client.get("/list");

			expect(result).toEqual([1, 2, 3]);
		});

		it("returns full response when data field is absent", async () => {
			mockFetch.mockResolvedValueOnce(
				new Response(JSON.stringify({ success: true, message: "ok" }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			);
			const client = makeClient();

			const result = await client.get("/status");

			expect(result).toEqual({ success: true, message: "ok" });
		});
	});
});
