import { describe, expect, it } from 'vitest';
import isCliRequest from '../isCliRequest.js';

describe('isCliRequest', () => {
	it('checks for curl headers', () => {
		const request = new Request('https://example.com', {
			headers: {
				'user-agent': 'curl/8.0'
			}
		});

		expect(isCliRequest(request)).toBe(true);
	});
});
