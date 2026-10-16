export type DetectionType = 'cli' | 'browser' | 'unknown';

export interface DetectionResult {
	type: DetectionType;
	client: string | null;
}

export interface DetectionOptions {
	/** Replace the built-in client list. */
	clients?: readonly string[];
	/** Add clients to the built-in list (or to `clients`, if you also pass it). */
	extendClients?: readonly string[];
	/**
	 * Replace the client header matching logic with your own regex. Group 1
	 * (or the whole match if there is no group) is reported as `client`.
	 * Takes priority over `clients` and `extendClients`.
	 */
	clientPattern?: RegExp;
}

export type RequestHeaders = Headers | Record<string, string | string[] | undefined>;

/**
 * Standard list of common CLI and HTTP tool client tokens.
 * Frozen to prevent extensions.
 */
export const DEFAULT_CLI_CLIENTS: readonly string[] = Object.freeze([
	'curl',
	'libcurl',
	'wget',
	'httpie',
	'python-requests',
	'python-urllib',
	'aiohttp',
	'python-httpx',
	'httpx',
	'go-http-client',
	'okhttp',
	'node-fetch',
	'axios',
	'undici',
	'bun',
	'deno',
	'postmanruntime',
	'insomnia',
	'powershell',
	'windowspowershell',
	'reqwest',
	'java',
	'lwp-request',
	'libwww-perl'
]);

function escapeRegex(str: string): string {
	// Escape special regex characters in the string
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildCliRegex(clients: readonly string[]): RegExp {
	// Sort by length descending so longer tokens match first
	const alternation = [...clients]
		.sort((a, b) => b.length - a.length)
		.map(escapeRegex)
		.join('|');

	return new RegExp(`(?:^|[^a-zA-Z0-9_-])(${alternation})(?=[/_\\s\\d.:;()-]|$)`, 'i');
}

const DEFAULT_CLI_REGEX = buildCliRegex(DEFAULT_CLI_CLIENTS);

/**
 * Positive browser detection regex.
 * Browsers usually identify with Mozilla/5.0 (or Mozilla/x.x) and an engine/product token.
 */
const BROWSER_TOKENS = [
	'Chrom(?:e|ium)',
	'CriOS',
	'Firefox',
	'FxiOS',
	'Edge?',
	'OPR',
	'Opera',
	'Safari'
];

const BROWSER_UA_REGEX = new RegExp(
	String.raw`Mozilla/\d+\.\d+.*(?:${BROWSER_TOKENS.join('|')})/`,
	'i'
);

function headerToString(value: unknown): string | null {
	if (Array.isArray(value)) return value.join(', ');
	return typeof value === 'string' ? value : null;
}

/**
 * Extracts a header value case-insensitively from either Fetch API Headers or a plain object.
 */
export function getHeaderValue(
	headers: RequestHeaders | null | undefined,
	name: string
): string | null {
	if (!headers || typeof headers !== 'object') return null;

	if (typeof (headers as Headers).get === 'function') {
		return (headers as Headers).get(name);
	}

	const record = headers as Record<string, unknown>;
	const target = name.toLowerCase();

	// Fast path: Node lowercases incoming header names
	const direct = record[target] ?? record[name];
	if (direct !== undefined) return headerToString(direct);

	// Fallback: case-insensitive scan
	const key = Object.keys(record).find((k) => k.toLowerCase() === target);
	return key === undefined ? null : headerToString(record[key]);
}

function isBrowser(userAgent: string, headers?: RequestHeaders | null): boolean {
	if (BROWSER_UA_REGEX.test(userAgent)) {
		return true;
	}

	// Corroborate browser identity via Sec-Fetch-* headers if userAgent starts with Mozilla/
	if (/^Mozilla\/\d+\.\d+/i.test(userAgent) && headers) {
		const secFetchMode = getHeaderValue(headers, 'sec-fetch-mode');
		const secFetchDest = getHeaderValue(headers, 'sec-fetch-dest');
		if (secFetchMode || secFetchDest) {
			return true;
		}
	}

	return false;
}

/**
 * Pure function to detect client type from a User-Agent string and optional headers.
 */
export function detectClient(
	userAgent?: string | null,
	headers?: RequestHeaders | null,
	options?: DetectionOptions
): DetectionResult {
	let ua = userAgent;
	if (!ua?.trim() && headers) {
		ua = getHeaderValue(headers, 'user-agent');
	}

	if (!ua || typeof ua !== 'string') {
		return { type: 'unknown', client: null };
	}

	const trimmedUa = ua.trim();
	if (trimmedUa === '') {
		return { type: 'unknown', client: null };
	}

	const sanitizedUa = trimmedUa.length > 2048 ? trimmedUa.slice(0, 2048) : trimmedUa;

	let clientRegex = DEFAULT_CLI_REGEX;
	let activeClients = DEFAULT_CLI_CLIENTS;

	if (options?.clients || options?.extendClients) {
		const list = options.clients ? [...options.clients] : [...DEFAULT_CLI_CLIENTS];
		if (options.extendClients) {
			list.push(...options.extendClients);
		}
		activeClients = list;
		clientRegex = buildCliRegex(activeClients);
	}

	const cliMatch = sanitizedUa.match(clientRegex);
	if (cliMatch && cliMatch[1]) {
		const matchedRaw = cliMatch[1].toLowerCase();
		const matchedToken =
			activeClients.find((c) => c.toLowerCase() === matchedRaw) ?? matchedRaw;
		return { type: 'cli', client: matchedToken };
	}

	if (isBrowser(sanitizedUa, headers)) {
		return { type: 'browser', client: null };
	}

	return { type: 'unknown', client: null };
}
