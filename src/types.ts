import { toPublicErrorMessage } from "./errors.js";

export interface ApidogClientConfig {
	accessToken: string;
	projectId: string;
	branchId: string;
	baseUrl?: string;
}

export interface ApidogResponse<T = unknown> {
	success?: boolean;
	data?: T;
}

export interface McpToolResult {
	[key: string]: unknown;
	content: Array<{ type: "text"; text: string }>;
	isError?: boolean;
}

export function jsonResult(data: unknown): McpToolResult {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
	};
}

export function compactJsonResult(data: unknown): McpToolResult {
	return {
		content: [{ type: "text" as const, text: JSON.stringify(data) }],
	};
}

export function errorResult(message: string): McpToolResult {
	return {
		content: [{ type: "text" as const, text: message }],
		isError: true,
	};
}

export function errorResultFrom(context: string, error: unknown): McpToolResult {
	return errorResult(`${context}: ${toPublicErrorMessage(error)}`);
}
