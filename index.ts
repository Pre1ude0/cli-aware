import isCliRequest from './isCliRequest.js';

function cliAware({
	request,
	browser,
	cli,
	fn = isCliRequest // Allow passing a custom function which evaluates weather the request is from a cli
}: {
	request: Request;
	browser?: () => Response;
	cli?: () => Response;
	fn?: (request: Request) => boolean;
}): Response | null {
	if (fn(request)) {
		return cli?.() ?? null;
	} else {
		return browser?.() ?? null;
	}
}

export default cliAware;
