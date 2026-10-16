<h1>
    Cli-Aware
    <img src="https://cli-aware.pre1ude.dev/favicon.png" alt="cli-aware logo" width="40" align="center">
</h1>

[![npm version](https://img.shields.io/npm/v/cli-aware.svg?style=flat-square)](https://www.npmjs.com/package/cli-aware)
[![npm downloads](https://img.shields.io/npm/dm/cli-aware.svg?style=flat-square)](https://www.npmjs.com/package/cli-aware)

Detect CLI clients and serve alternative responses depending on the environment.

`cli-aware` lets you send different content to browsers, `curl`, `wget`, and other terminal clients, while staying framework agnostic.

## Installation

```bash
npm install cli-aware
```

## Usage

```ts
// +server.ts (SvelteKit)
import CliAware from 'cli-aware';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ request }) => {
    const aware = new CliAware(request);

    if (aware.cli) {
        return new Response('Hello CLI user!');
    }

    if (aware.browser) {
        return new Response('Hello browser user!');
    }

    return new Response('Hello mysterious (perhaps spoofed?) user!');
};
```

## Contributing

Pull requests are always welcome!

Before opening a PR, please run the checks and format your code with Prettier:

```bash
npm run check && npm run format
```

For major changes, please open an issue for discussion first.
