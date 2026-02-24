export class ApidogApiError extends Error {
	constructor(
		public readonly method: string,
		public readonly path: string,
		public readonly statusCode: number,
		public readonly responseBody: string,
	) {
		super(`Apidog API ${method} ${path} failed (${statusCode})`);
		this.name = "ApidogApiError";
	}
}

export class ApidogConfigError extends Error {
	constructor(public readonly variableName: string) {
		super(`Missing required environment variable: ${variableName}`);
		this.name = "ApidogConfigError";
	}
}

export function toPublicErrorMessage(error: unknown): string {
	if (error instanceof ApidogApiError) {
		return `Apidog API ${error.method} ${error.path} failed (${error.statusCode})`;
	}

	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}
