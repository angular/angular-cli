
/**
 * *** NOTE ON IMPORTING FROM ANGULAR AND NGUNIVERSAL IN THIS FILE ***
 *
 * If your application uses third-party dependencies, you'll need to
 * either use Webpack or the Angular CLI's `bundleDependencies` feature
 * in order to adequately package them for use on the server without a
 * node_modules directory.
 *
 * However, due to the nature of the CLI's `bundleDependencies`, importing
 * Angular in this file will create a different instance of Angular than
 * the version in the compiled application code. This leads to unavoidable
 * conflicts. Therefore, please do not explicitly import from @angular or
 * @nguniversal in this file. You can export any needed resources
 * from your application's main.server.ts file, as seen below with the
 * import for `ngHapiEngine`.
 */

import 'zone.js/dist/zone-node';

import {Request, Server} from 'hapi';
import * as Inert from 'inert';
import {join} from 'path';

// Hapi server
const PORT = process.env.PORT || <%= serverPort %>;
const server = new Server({ port: PORT, host: 'localhost' });

const DIST_FOLDER = join(process.cwd(), 'dist');

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const {AppServerModule, ngHapiEngine} = require('./<%= getServerDistDirectory() %>/main');

server.route({
  method: 'GET',
  path: '*',
  handler: (req: Request) =>
    ngHapiEngine({
      bootstrap: AppServerModule,
      req,
    })
});

(async() => {
  await server.register(Inert);

  // Client bundles will be statically served from the built/ directory.
  server.route({
    method: 'GET',
    path: '{file*}',
    handler: {
      directory: {
        path: join(DIST_FOLDER, '<%= clientProject %>')
      }
    }
  });

  await server.start();
  console.log(`Node Hapi server listening on http://localhost:${PORT}`);
})();
