import 'zone.js/dist/zone-node';

import { ngHapiEngine } from '@nguniversal/hapi-engine';
import { Request, Server } from 'hapi';
import * as Inert from 'inert';
import { join } from 'path';

import { AppServerModule } from './src/main.server';

// Hapi server
async function run(): Promise<void> {
  const port: string | number = process.env.PORT || 4000;
  const server = new Server({ port, host: 'localhost' });
  const distFolder = join(process.cwd(), 'dist/hapi-ve/browser');

  server.route({
    method: 'GET',
    path: '/*',
    handler: (req: Request) =>
      ngHapiEngine({
        bootstrap: AppServerModule,
        req,
      })
  });

  await server.register(Inert);

  // Client bundles will be statically served from the built/ directory.
  server.route({
    method: 'GET',
    path: '/{file*}',
    handler: {
      directory: {
        path: distFolder
      }
    }
  });

  await server.start();
  console.log(`Node Hapi server listening on http://localhost:${port}`);
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
