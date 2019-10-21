import 'zone.js/dist/zone-node';

import { ngHapiEngine } from '@nguniversal/hapi-engine';
import * as inert from '@hapi/inert';
import { Request, Server, ResponseToolkit } from '@hapi/hapi';
import { join } from 'path';
import { readFileSync } from 'fs';

import { AppServerModuleNgFactory } from './src/main.server';

// The Hapi server is exported so that it can be used by serverless functions.
export async function app() {
  const port = process.env.PORT || 4000;
  const distFolder = join(process.cwd(), 'dist/hapi-engine-ve/browser');
  const server = new Server({
    port,
    routes: {
      files: {
        relativeTo: distFolder
      }
    },
  });

  const document = readFileSync(join(distFolder, 'index.html'), 'utf-8');

  server.route({
    method: 'GET',
    path: '/{path*}',
    handler: (req: Request) => ngHapiEngine({
      bootstrap: AppServerModuleNgFactory,
      document,
      req,
    })
  });

  await server.register(inert);

  // Client bundles will be statically served from the dist directory.
  server.route({
    method: 'GET',
    path: '/{filename}.{ext}',
    handler: (req: Request, res: ResponseToolkit) =>
      res.file(`${req.params.filename}.${req.params.ext}`)
  });

  return server;
}

async function run(): Promise<void> {
  const server = await app();
  await server.start();
  console.log(`Node Hapi server listening on http://${server.info.host}:${server.info.port}`);
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
if (mainModule && mainModule.filename === __filename) {
  run().catch(error => {
    console.error(`Error: ${error.toString()}`);
    process.exit(1);
  });
}

export * from './src/main.server';
