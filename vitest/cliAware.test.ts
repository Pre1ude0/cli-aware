import { describe, it, expect, expectTypeOf } from 'vitest';
import CliAware, { detectClient, DEFAULT_CLI_CLIENTS, isCliRequest } from '../index.js';

describe('CliAware class constructor and call forms', () => {
	it('supports new CliAware(request) with Fetch Request', () => {
		const req = new Request('https://example.com', {
			headers: { 'user-agent': 'curl/8.4.0' }
		});

		const result = new CliAware(req);

		expect(result).toBeInstanceOf(CliAware);
		expect(result.request).toBe(req);
		expect(result.cli).toBe(true);
		expect(result.browser).toBe(false);
		expect(result.unknown).toBe(false);
		expect(result.client).toBe('curl');
		expectTypeOf(result.request).toEqualTypeOf<Request>();
	});

	it('supports new CliAware({ request, ...extra }) preserving and strongly typing extra fields', () => {
		const req = new Request('https://example.com', {
			headers: {
				'user-agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			}
		});

		const result = new CliAware(req);

		expect(result).toBeInstanceOf(CliAware);
		expect(result.request).toBe(req);
		expect(result.browser).toBe(true);
		expect(result.cli).toBe(false);
		expect(result.unknown).toBe(false);
		expect(result.client).toBeNull();

		expectTypeOf(result.request).toEqualTypeOf<Request>();
	});

	it('does not allow extra fields to overwrite core CliAware properties or pollute prototypes', () => {
		const req = new Request('https://example.com', {
			headers: { 'user-agent': 'curl/8.0' }
		});

        const result = new CliAware(
            req,
            {
                cli: false,
                client: 'malicious',
                browser: true,
                __proto__: { polluted: true },
                constructor: 'bad-constructor',
                prototype: 'bad-prototype'
            } as any);

		expect(result.cli).toBe(true);
		expect(result.browser).toBe(false);
		expect(result.client).toBe('curl');
		expect((result as any).polluted).toBeUndefined();
		expect(({} as any).polluted).toBeUndefined();
	});

	it('disambiguates requests having an internal request property from options bags', () => {
		// A request object (e.g. Express req or webhook envelope) that has headers AND a request property
		const reqWithInternalProp = {
			headers: { 'user-agent': 'curl/8.0' },
			request: '/api/v1/resource'
		};

		const result = new CliAware(reqWithInternalProp);
		expect(result.cli).toBe(true);
		expect(result.client).toBe('curl');
		expect(result.request).toBe(reqWithInternalProp);
	});

	it('maintains exact mutual exclusivity: exactly one of cli, browser, unknown is true', () => {
		const testCases = [
			{ ua: 'curl/8.0', expected: 'cli' },
			{
				ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
				expected: 'browser'
			},
			{ ua: '', expected: 'unknown' },
			{ ua: 'UnrecognizedBot/1.0', expected: 'unknown' }
		];

		for (const { ua, expected } of testCases) {
			const res = new CliAware({ headers: { 'user-agent': ua } });
			const flags = [res.cli, res.browser, res.unknown];
			const trueCount = flags.filter(Boolean).length;
			expect(trueCount).toBe(1);

			if (expected === 'cli') {
				expect(res.cli).toBe(true);
				expect(res.client).not.toBeNull();
			} else if (expected === 'browser') {
				expect(res.browser).toBe(true);
				expect(res.client).toBeNull();
			} else {
				expect(res.unknown).toBe(true);
				expect(res.client).toBeNull();
			}
		}
	});
});

describe('Input shapes and header extraction', () => {
	it('handles Fetch API Request', () => {
		const req = new Request('https://api.test', {
			headers: { 'user-agent': 'HTTPie/3.2.1' }
		});
		const res = new CliAware(req);
		expect(res.cli).toBe(true);
		expect(res.client).toBe('httpie');
	});

	it('handles Node.js IncomingMessage shape (headers as plain object with string value)', () => {
		const req = {
			headers: {
				'user-agent': 'Wget/1.21.3'
			}
		};
		const res = new CliAware(req);
		expect(res.cli).toBe(true);
		expect(res.client).toBe('wget');
	});

	it('handles Node.js IncomingMessage with array-valued header', () => {
		const req = {
			headers: {
				'user-agent': ['curl/7.88.1']
			}
		};
		const res = new CliAware(req);
		expect(res.cli).toBe(true);
		expect(res.client).toBe('curl');
	});

	it('handles plain object with Headers instance', () => {
		const headers = new Headers();
		headers.set('User-Agent', 'python-requests/2.31.0');
		const req = { headers };
		const res = new CliAware(req);
		expect(res.cli).toBe(true);
		expect(res.client).toBe('python-requests');
	});

	it('performs case-insensitive header lookup across casing variants', () => {
		const cases = ['user-agent', 'User-Agent', 'USER-AGENT', 'uSeR-aGeNt'];
		for (const headerKey of cases) {
			const req = {
				headers: {
					[headerKey]: 'axios/1.6.2'
				}
			};
			const res = new CliAware(req);
			expect(res.cli).toBe(true);
			expect(res.client).toBe('axios');
		}
	});

	it('handles missing, null, empty, and whitespace user-agent headers safely', () => {
		const emptyInputs = [
			{ headers: {} },
			{ headers: { 'user-agent': '' } },
			{ headers: { 'user-agent': '   ' } },
			{ headers: { 'user-agent': undefined } },
			{},
			null,
			undefined
		];

		for (const input of emptyInputs) {
            try {
                new CliAware(input as any);
            } catch (e) {
                expect(e).toBeInstanceOf(TypeError);
            }
		}
	});
});

describe('Real-world User-Agent test suite', () => {
	it('detects desktop Chrome', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
		const res = new CliAware({ headers: { 'user-agent': ua } });
		expect(res.browser).toBe(true);
		expect(res.cli).toBe(false);
		expect(res.client).toBeNull();
	});

	it('detects desktop Firefox', () => {
		const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0';
		const res = new CliAware({ headers: { 'user-agent': ua } });
		expect(res.browser).toBe(true);
		expect(res.cli).toBe(false);
		expect(res.client).toBeNull();
	});

	it('detects desktop Safari', () => {
		const ua =
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15';
		const res = new CliAware({ headers: { 'user-agent': ua } });
		expect(res.browser).toBe(true);
		expect(res.cli).toBe(false);
		expect(res.client).toBeNull();
	});

	it('detects Microsoft Edge', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
		const res = new CliAware({ headers: { 'user-agent': ua } });
		expect(res.browser).toBe(true);
		expect(res.cli).toBe(false);
		expect(res.client).toBeNull();
	});

	it('detects mobile Safari on iPhone', () => {
		const ua =
			'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1';
		expect(new CliAware({ headers: { 'user-agent': ua } }).browser).toBe(true);
	});

	it('detects mobile Chrome on Android', () => {
		const ua =
			'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36';
		expect(new CliAware({ headers: { 'user-agent': ua } }).browser).toBe(true);
	});

	it('detects curl', () => {
		const uas = ['curl/8.4.0', 'curl/7.68.0', 'CURL/8.1.0', 'curl'];
		for (const ua of uas) {
			const res = new CliAware({ headers: { 'user-agent': ua } });
			expect(res.cli).toBe(true);
			expect(res.client).toBe('curl');
		}
	});

	it('detects libcurl', () => {
		const res = new CliAware({ headers: { 'user-agent': 'libcurl/8.4.0' } });
		expect(res.cli).toBe(true);
		expect(res.client).toBe('libcurl');
	});

	it('detects wget', () => {
		const uas = ['Wget/1.21.4', 'wget/1.20', 'Wget'];
		for (const ua of uas) {
			const res = new CliAware({ headers: { 'user-agent': ua } });
			expect(res.cli).toBe(true);
			expect(res.client).toBe('wget');
		}
	});

	it('detects httpie', () => {
		const uas = ['HTTPie/3.2.2', 'httpie/3.0.0', 'HTTPie'];
		for (const ua of uas) {
			const res = new CliAware({ headers: { 'user-agent': ua } });
			expect(res.cli).toBe(true);
			expect(res.client).toBe('httpie');
		}
	});

	it('detects python-requests', () => {
		const res = new CliAware({
			headers: { 'user-agent': 'python-requests/2.31.0' }
		});
		expect(res.cli).toBe(true);
		expect(res.client).toBe('python-requests');
	});

	it('detects node-fetch', () => {
		const res = new CliAware({
			headers: {
				'user-agent': 'node-fetch/3.3.2 (+https://github.com/node-fetch/node-fetch)'
			}
		});
		expect(res.cli).toBe(true);
		expect(res.client).toBe('node-fetch');
	});

	it('detects axios', () => {
		const res = new CliAware({ headers: { 'user-agent': 'axios/1.6.2' } });
		expect(res.cli).toBe(true);
		expect(res.client).toBe('axios');
	});

	it('detects okhttp', () => {
		const res = new CliAware({ headers: { 'user-agent': 'okhttp/4.12.0' } });
		expect(res.cli).toBe(true);
		expect(res.client).toBe('okhttp');
	});

	it('detects Go-http-client', () => {
		const uas = ['Go-http-client/1.1', 'Go-http-client/2.0'];
		for (const ua of uas) {
			const res = new CliAware({ headers: { 'user-agent': ua } });
			expect(res.cli).toBe(true);
			expect(res.client).toBe('go-http-client');
		}
	});

	it('detects undici', () => {
		const res = new CliAware({ headers: { 'user-agent': 'undici' } });
		expect(res.cli).toBe(true);
		expect(res.client).toBe('undici');
	});

	it('detects Bun and Deno', () => {
		const bunRes = new CliAware({ headers: { 'user-agent': 'Bun/1.0.14' } });
		expect(bunRes.cli).toBe(true);
		expect(bunRes.client).toBe('bun');

		const denoRes = new CliAware({
			headers: { 'user-agent': 'Deno/1.38.2' }
		});
		expect(denoRes.cli).toBe(true);
		expect(denoRes.client).toBe('deno');
	});

	it('detects python-urllib, aiohttp, and httpx', () => {
		expect(new CliAware({ headers: { 'user-agent': 'Python-urllib/3.11' } }).client).toBe(
			'python-urllib'
		);
		expect(
			new CliAware({
				headers: { 'user-agent': 'Python/3.11 aiohttp/3.8.5' }
			}).client
		).toBe('aiohttp');
		expect(
			new CliAware({
				headers: { 'user-agent': 'python-httpx/0.25.0' }
			}).client
		).toBe('python-httpx');
		expect(new CliAware({ headers: { 'user-agent': 'HTTPX/0.25.0' } }).client).toBe('httpx');
	});

	it('detects Postman, Insomnia, and PowerShell', () => {
		expect(
			new CliAware({
				headers: { 'user-agent': 'PostmanRuntime/7.35.0' }
			}).client
		).toBe('postmanruntime');
		expect(new CliAware({ headers: { 'user-agent': 'insomnia/2023.5.8' } }).client).toBe(
			'insomnia'
		);
		expect(new CliAware({ headers: { 'user-agent': 'PowerShell/7.4.0' } }).client).toBe(
			'powershell'
		);
		expect(
			new CliAware({
				headers: { 'user-agent': 'WindowsPowerShell/5.1.19041' }
			}).client
		).toBe('windowspowershell');
	});

	it('detects Java and reqwest', () => {
		expect(new CliAware({ headers: { 'user-agent': 'Java/17.0.9' } }).client).toBe('java');
		expect(new CliAware({ headers: { 'user-agent': 'Java/1.8.0_381' } }).client).toBe('java');
		expect(new CliAware({ headers: { 'user-agent': 'reqwest/0.11.24' } }).client).toBe('reqwest');
	});
});

describe('Tricky strings and anti-false-positive suite', () => {
	it('does NOT misclassify JavaScript engine / JS token as Java CLI client', () => {
		const ua = 'JavaScript/1.0 (ECMAScript 2023 engine)';
		const res = new CliAware({ headers: { 'user-agent': ua } });
		expect(res.cli).toBe(false);
		expect(res.unknown).toBe(true);
		expect(res.client).toBeNull();
	});

	it('does NOT misclassify general word containing java as Java CLI client', () => {
		const ua = 'MyJavabeansApp/2.0';
		const res = new CliAware({ headers: { 'user-agent': ua } });
		expect(res.cli).toBe(false);
		expect(res.unknown).toBe(true);
	});

	it('does NOT misclassify generic fetch word or URL containing fetch as CLI', () => {
		const ua =
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko; Fetch/1.0) Chrome/120.0.0.0 Safari/537.36';
		const res = new CliAware({ headers: { 'user-agent': ua } });
		expect(res.browser).toBe(true);
		expect(res.cli).toBe(false);
		expect(res.client).toBeNull();
	});

	it('does NOT misclassify standard browser tokens containing "like Gecko" as CLI or unknown', () => {
		const ua = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/119.0';
		const res = new CliAware({ headers: { 'user-agent': ua } });
		expect(res.browser).toBe(true);
		expect(res.cli).toBe(false);
	});

	it('does NOT misclassify bare Mozilla/5.0 without browser engine as browser', () => {
		const ua = 'Mozilla/5.0';
		const res = new CliAware({ headers: { 'user-agent': ua } });
		expect(res.browser).toBe(false);
		expect(res.cli).toBe(false);
		expect(res.unknown).toBe(true);
	});

	it('does NOT misclassify web crawlers/bots as browsers', () => {
		const bots = [
			'Googlebot/2.1 (+http://www.google.com/bot.html)',
			'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
			'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
			'Baiduspider+(+http://www.baidu.com/search/spider.htm)'
		];

		for (const bot of bots) {
			const res = new CliAware({ headers: { 'user-agent': bot } });
			expect(res.browser).toBe(false);
			expect(res.cli).toBe(false);
			expect(res.unknown).toBe(true);
			expect(res.client).toBeNull();
		}
	});

	it('does NOT misclassify generic custom client names as browsers', () => {
		const ua = 'InternalService/3.4 (x86_64; linux)';
		const res = new CliAware({ headers: { 'user-agent': ua } });
		expect(res.browser).toBe(false);
		expect(res.cli).toBe(false);
		expect(res.unknown).toBe(true);
	});

	it('handles extremely long User-Agent headers safely without ReDoS', () => {
		const longUa = 'a'.repeat(100000);
		const start = Date.now();
		const res = new CliAware({ headers: { 'user-agent': longUa } });
		const elapsed = Date.now() - start;

		expect(elapsed).toBeLessThan(100);
		expect(res.unknown).toBe(true);
	});
});

describe('Customization, purity, and frozen state', () => {
	it('DEFAULT_CLI_CLIENTS is frozen against mutation', () => {
		expect(Object.isFrozen(DEFAULT_CLI_CLIENTS)).toBe(true);
		expect(() => {
			(DEFAULT_CLI_CLIENTS as any).push('new-tool');
		}).toThrow();
	});

	it('supports custom client list via detection options', () => {
		const req = { headers: { 'user-agent': 'custom-tool/2.0' } };

		// Default behavior: unknown
		expect(new CliAware(req).unknown).toBe(true);

		// With custom clients:
		const customRes = new CliAware(req, { clients: ['custom-tool'] });
		expect(customRes.cli).toBe(true);
		expect(customRes.client).toBe('custom-tool');
	});

	it('supports extendClients option to append to default list', () => {
		const customReq = { headers: { 'user-agent': 'my-custom-cli/1.0' } };
		const curlReq = { headers: { 'user-agent': 'curl/8.0' } };

		const res1 = new CliAware(customReq, {
			extendClients: ['my-custom-cli']
		});
		expect(res1.cli).toBe(true);
		expect(res1.client).toBe('my-custom-cli');

		// curl is still recognized
		const res2 = new CliAware(curlReq, {
			extendClients: ['my-custom-cli']
		});
		expect(res2.cli).toBe(true);
		expect(res2.client).toBe('curl');
	});

	it('pure detectClient function works directly without request object', () => {
		expect(detectClient('curl/8.0')).toEqual({
			type: 'cli',
			client: 'curl'
		});

		expect(detectClient(null)).toEqual({
			type: 'unknown',
			client: null
		});

		expect(detectClient('')).toEqual({
			type: 'unknown',
			client: null
		});

		const browserRes = detectClient(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
		);
		expect(browserRes).toEqual({
			type: 'browser',
			client: null
		});
	});

	it('isCliRequest backward-compatibility function functions correctly', () => {
		expect(
			isCliRequest(
				new Request('https://test', {
					headers: { 'user-agent': 'curl/8.0' }
				})
			)
		).toBe(true);
		expect(
			isCliRequest(
				new Request('https://test', {
					headers: { 'user-agent': 'Mozilla/5.0 Chrome/120' }
				})
			)
		).toBe(false);
	});
});
