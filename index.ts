function predicate(request: Request): boolean {
	if (request.headers.get('user-agent')?.includes('curl')) {
		// Temporary "solution" for now while I set up the package
		return true;
	}
	return false;
}

function cliAware({
	request,
	browser,
	cli,
	fn = predicate // Allow passing a custom function which evaluates weather the request is from a cli
}: {
	request: Request;
	browser?: () => Response | null;
	cli?: () => Response | null;
	fn?: (request: Request) => boolean;
}): Response | null {
	if (fn(request)) {
		return cli?.() ?? null;
	} else {
		return browser?.() ?? null;
	}
}

export default cliAware;
