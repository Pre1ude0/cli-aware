const clients = [
	'curl',
	'wget',
	'httpie',
	'fetch',
	'lwp-request',
	'http-client',
	'python-requests',
	'go-http-client',
	'java',
	'okhttp',
	'node-fetch',
	'axios'
];
const regexPattern = new RegExp(`(${clients.join('|')}).*\/`, 'i');

export function isCliRequest(request: Request): boolean {
	const userAgent = request.headers.get('user-agent');
	if (!userAgent || userAgent.trim() === '') {
		return false;
	}
	return regexPattern.test(userAgent);
}

export default isCliRequest;
