import 'zone.js/dist/zone-node';
import {enableProdMode} from '@angular/core';
// Hapi Engine
import {ngHapiEngine} from '@nguniversal/hapi-engine';
// Import module map for lazy loading
import {provideModuleMap} from '@nguniversal/module-map-ngfactory-loader';

import {Request, Server} from 'hapi';
import * as Inert from 'inert';
import {join} from 'path';

// Faster server renders w/ Prod mode (dev mode never needed)
enableProdMode();

// Hapi server
const PORT = process.env.PORT || <%= serverPort %>;
const server = new Server({ port: PORT, host: 'localhost' });

const DIST_FOLDER = join(process.cwd(), 'dist');

// * NOTE :: leave this as require() since this file is built Dynamically from webpack
const {AppServerModuleNgFactory, LAZY_MODULE_MAP} = require('./<%= clientProject %>-server/main');

server.route({
  method: 'GET',
  path: '*',
  handler: (req: Request) =>
    ngHapiEngine({
      bootstrap: AppServerModuleNgFactory,
      req,
      providers: [
        provideModuleMap(LAZY_MODULE_MAP)
      ]
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
