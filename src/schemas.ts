import { z } from "zod";

export const parametersSchema = z
	.object({
		query: z.array(z.record(z.unknown())).default([]),
		header: z.array(z.record(z.unknown())).default([]),
		cookie: z.array(z.record(z.unknown())).default([]),
		path: z.array(z.record(z.unknown())).default([]),
	})
	.optional()
	.describe("Request parameters (query, header, cookie, path)");

export const requestBodySchema = z
	.object({
		parameters: z.array(z.record(z.unknown())).default([]),
		type: z.string().default("none"),
		data: z.string().default(""),
	})
	.optional()
	.describe("Request body configuration");

export const authSchema = z.record(z.unknown()).default({}).describe("Auth configuration (e.g. bearer token)");

export const processorsSchema = z
	.array(z.record(z.unknown()))
	.default([])
	.describe("Script processors (pre-request or post-response)");

export const DEFAULT_PARAMETERS = { query: [], header: [], cookie: [], path: [] } as const;
export const DEFAULT_REQUEST_BODY = { parameters: [], type: "none", data: "" } as const;
