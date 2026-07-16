# cli-aware
Detect cli clients and serve alternative responses depending on the environment.

[![npm version](https://img.shields.io/npm/v/cli-aware.svg)](https://www.npmjs.com/package/cli-aware)
[![npm downloads](https://img.shields.io/npm/dm/cli-aware.svg)](https://www.npmjs.com/package/cli-aware)

`cli-aware` helps you provide different content and responses to browsers, curl, wget, and other terminal clients while staying framework agnostic.

```ts
// +server.ts
import cliAware from "cli-aware";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ request }) => {
    return cliAware({
        request,
        browser() {
            // Browser response
            return new Response("`curl` this page in your terminal!");
        },
        cli() {
            // cli response
            return new Response("Hello from the cli!");
        },
    }) as Response;
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
