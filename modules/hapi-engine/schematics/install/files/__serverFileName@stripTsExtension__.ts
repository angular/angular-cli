import 'zone.js/dist/zone-node';

import { ngHapiEngine } from '@nguniversal/hapi-engine';
import * as inert from 'inert';
import * as vision from 'vision';
import { Request, Server, ResponseToolkit } from 'hapi';
import { join } from 'path';

import { AppServerModule } from './src/<%= stripTsExtension(main) %>';

// Hapi server
async function run(): Promise<void> {
  const port: string | number = process.env.PORT || <%= serverPort %>;
  const distFolder = join(process.cwd(), '<%= browserDistDirectory %>');
  const server = new Server({
    port,
    host: 'localhost',
    routes: {
      files: {
        relativeTo: distFolder
      }
    },
  });

  await server.register(vision);
  server.views({
    engines: {
      html : {
        compile: (document: string) => (req: Request) => ngHapiEngine({
          bootstrap: AppServerModule,
          document,
          req,
        })
      }
    },
    path: distFolder,
  });

  server.route({
    method: 'GET',
    path: '/{path*}',
    handler: (req: Request, res: ResponseToolkit) =>
      res.view('index', req)
  });

  await server.register(inert);

  // Client bundles will be statically served from the dist directory.
  server.route({
    method: 'GET',
    path: '/{filename}.{ext}',
    handler: (req: Request, res: ResponseToolkit) =>
      res.file(`${req.params.filename}.${req.params.ext}`)
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

export * from './src/<%= stripTsExtension(main) %>';
