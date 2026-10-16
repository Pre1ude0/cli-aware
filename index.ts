import {
	detectClient,
	getHeaderValue,
	type DetectionResult,
	type DetectionType,
	type DetectionOptions,
	type RequestHeaders,
	DEFAULT_CLI_CLIENTS
} from './detectClient.js';

export type RequestInput = Request | { headers?: RequestHeaders };

/**
 * Detects whether a request comes from a cli client (curl, wget, ...), a browser, or something else.
 *
 * @example
 * const aware = new CliAware(request);
 * if (aware.cli) { ... }
 *
 * @example
 * const aware = new CliAware(request, { clients: [ "targetclient" ] });
 * if (aware.cli && aware.client === "targetclient") { ... }
 */
export default class CliAware<R extends RequestInput, O extends DetectionOptions> {
	readonly request: R;
	readonly options: O;
	readonly cli: boolean;
	readonly browser: boolean;
	readonly unknown: boolean;
	readonly client: string | null;

	constructor(request: R, options: O = {} as O) {
		if (request == null) throw new TypeError("CliAware: 'request' argument is required.");

		this.request = request;
		this.options = options;

		const rawHeaders = (request as { headers?: unknown } | null | undefined)?.headers;
		const headers =
			rawHeaders && typeof rawHeaders === 'object' ? (rawHeaders as RequestHeaders) : null;

		const detection = detectClient(getHeaderValue(headers, 'user-agent'), headers, options);

		this.cli = detection.type === 'cli';
		this.browser = detection.type === 'browser';
		this.unknown = detection.type === 'unknown';
		this.client = detection.client;
	}
}

/**
 * Alternative (and possibly cleaner) method for just cli detection.
 *
 * @example
 * if (isCliRequest(request)) { ... }
 */
export function isCliRequest(request: RequestInput, options?: DetectionOptions): boolean {
	return new CliAware(request, options).cli;
}

export { detectClient, DEFAULT_CLI_CLIENTS };
export type { DetectionResult, DetectionType, DetectionOptions, RequestHeaders };
