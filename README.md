# cli-aware

Detect cli clients and serve alternative responses depending on the environment.

[![npm version](https://img.shields.io/npm/v/cli-aware.svg)](https://www.npmjs.com/package/cli-aware)
[![npm downloads](https://img.shields.io/npm/dm/cli-aware.svg)](https://www.npmjs.com/package/cli-aware)

`cli-aware` helps you provide different content and responses to browsers, curl, wget, and other terminal clients while staying framework agnostic.

```ts
// +server.ts
import cliAware from 'cli-aware';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request }) => {
	let aware = new cliAware(request);

	if (aware.cli) {
        return new Response('Hello CLI user!');
    } else if (aware.browser) {
        return new Response('Hello browser user!');
    } else {
        return new Response('Hello mysterious (perhaps spoofed..?) user!');
    }
};
```

## Installation

via npm

```bash
npm install cli-aware
```

via pnpm

```bash
pnpm add cli-aware
```

## Contributing

Pull requests are always welcome!

When creating a PR, please format your code via prettier by running

```bash
npm run check && npm run format
```
