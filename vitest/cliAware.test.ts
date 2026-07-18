import { describe, it, expect } from 'vitest';
import cliAware from '../index.js';

describe('cliAware', () => {
	it('returns a function that checks for CLI requests', () => {
		const request = new Request('https://example.com', {
			headers: {
				'user-agent': 'curl/8.0'
			}
		});

		const fields = {
			request,
			cli: () => {
				return new Response('cli');
			}
		};

		expect(cliAware(fields)!.text()).resolves.toBe('cli');
		expect(cliAware(fields)).not.toBeNull();
	});
});

describe('cliAware', () => {
	it('returns a function that checks for browser requests', () => {
		const request = new Request('https://example.com', {
			headers: {
				'user-agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
			}
		});

		const fields = {
			request,
			browser: () => {
				return new Response('browser');
			}
		};

		expect(cliAware(fields)!.text()).resolves.toBe('browser');
		expect(cliAware(fields)).not.toBeNull();
	});
});
