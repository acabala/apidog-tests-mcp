import { ApidogApiError, ApidogConfigError } from "./errors.js";
import type { ApidogClientConfig, ApidogResponse } from "./types.js";

const DEFAULT_BASE_URL = "https://api.apidog.com/api/v1";

export class ApidogClient {
	private readonly accessToken: string;
	private readonly projectId: string;
	private readonly branchId: string;
	private readonly baseUrl: string;

	constructor(config: ApidogClientConfig) {
		this.accessToken = config.accessToken;
		this.projectId = config.projectId;
		this.branchId = config.branchId;
		this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
	}

	static fromEnv(): ApidogClient {
		return new ApidogClient({
			accessToken: requireEnv("APIDOG_ACCESS_TOKEN"),
			projectId: requireEnv("APIDOG_PROJECT_ID"),
			branchId: requireEnv("APIDOG_BRANCH_ID"),
			baseUrl: process.env.APIDOG_BASE_URL,
		});
	}

	get project(): string {
		return this.projectId;
	}

	private headers(): Record<string, string> {
		return {
			Authorization: `Bearer ${this.accessToken}`,
			"x-project-id": this.projectId,
			"x-branch-id": this.branchId,
			"x-client-mode": "web",
			"x-client-version": "2.8.9",
			"x-device-id": "@acabala/apidog-tests-mcp",
			"Content-Type": "application/json",
			Accept: "application/json",
		};
	}

	private buildUrl(path: string, params?: Record<string, string>): string {
		const u = new URL(`${this.baseUrl}${path}`);
		u.searchParams.set("locale", "en-US");
		if (params) {
			for (const [k, v] of Object.entries(params)) {
				u.searchParams.set(k, v);
			}
		}
		return u.toString();
	}

	private async request<T = unknown>(
		method: string,
		path: string,
		body?: unknown,
		params?: Record<string, string>,
	): Promise<T> {
		const url = this.buildUrl(path, params);
		const res = await fetch(url, {
			method,
			headers: this.headers(),
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!res.ok) {
			const text = await res.text();
			throw new ApidogApiError(method, path, res.status, text);
		}

		const json = (await res.json()) as ApidogResponse<T>;
		if (json.success === false) {
			throw new ApidogApiError(method, path, res.status, JSON.stringify(json));
		}
		return (json.data !== undefined ? json.data : json) as T;
	}

	async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
		return this.request<T>("GET", path, undefined, params);
	}

	async post<T = unknown>(path: string, body: unknown): Promise<T> {
		return this.request<T>("POST", path, body);
	}

	async put<T = unknown>(path: string, body: unknown): Promise<T> {
		return this.request<T>("PUT", path, body);
	}

	async delete<T = unknown>(path: string, body?: unknown): Promise<T> {
		return this.request<T>("DELETE", path, body);
	}

	async postForm<T = unknown>(path: string, formData: Record<string, string>): Promise<T> {
		const headers = this.headers();
		headers["Content-Type"] = "application/x-www-form-urlencoded";
		const body = new URLSearchParams(formData).toString();
		const url = this.buildUrl(path);
		const res = await fetch(url, { method: "POST", headers, body });

		if (!res.ok) {
			const text = await res.text();
			throw new ApidogApiError("POST", path, res.status, text);
		}

		const json = (await res.json()) as ApidogResponse<T>;
		if (json.success === false) {
			throw new ApidogApiError("POST", path, res.status, JSON.stringify(json));
		}
		return (json.data !== undefined ? json.data : json) as T;
	}
}

function requireEnv(name: string): string {
	const val = process.env[name];
	if (!val) throw new ApidogConfigError(name);
	return val;
}
