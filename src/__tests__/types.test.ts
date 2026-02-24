import { describe, expect, it } from "vitest";
import { errorResult, jsonResult } from "../types.js";

describe("jsonResult", () => {
	it("wraps data as pretty-printed JSON text content", () => {
		const result = jsonResult({ foo: "bar", count: 42 });

		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe("text");
		expect(JSON.parse(result.content[0].text)).toEqual({ foo: "bar", count: 42 });
	});

	it("handles arrays", () => {
		const result = jsonResult([1, 2, 3]);

		expect(JSON.parse(result.content[0].text)).toEqual([1, 2, 3]);
	});

	it("handles null", () => {
		const result = jsonResult(null);

		expect(JSON.parse(result.content[0].text)).toBeNull();
	});

	it("pretty-prints with 2-space indentation", () => {
		const result = jsonResult({ a: 1 });

		expect(result.content[0].text).toBe('{\n  "a": 1\n}');
	});

	it("does not set isError", () => {
		const result = jsonResult({});

		expect(result.isError).toBeUndefined();
	});
});

describe("errorResult", () => {
	it("wraps message as text content with isError flag", () => {
		const result = errorResult("Something went wrong");

		expect(result.content).toHaveLength(1);
		expect(result.content[0].type).toBe("text");
		expect(result.content[0].text).toBe("Something went wrong");
		expect(result.isError).toBe(true);
	});

	it("preserves the full error message", () => {
		const msg = "Apidog API GET /foo failed (500): Internal Server Error";
		const result = errorResult(msg);

		expect(result.content[0].text).toBe(msg);
	});
});
