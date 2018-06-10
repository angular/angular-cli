/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/* tslint:disable:no-console  */
import {ngHapiEngine} from '@nguniversal/hapi-engine';

require('zone.js/dist/zone-node.js');

import {enableProdMode} from '@angular/core';
import {Server, Request} from 'hapi';
import * as Inert from 'inert';

import {HelloWorldServerModuleNgFactory} from './helloworld/app.server.ngfactory';
const helloworld = require('raw-loader!./helloworld/index.html');

const server = new Server({ port: 9876, host: 'localhost' });

enableProdMode();

// Keep the browser logs free of errors.
server.route({
  method: 'GET',
  path: '/favicon.ico',
  handler: () => ''
});

//-----------ADD YOUR SERVER SIDE RENDERED APP HERE ----------------------
server.route({
  method: 'GET',
  path: '/helloworld',
  handler: (req: Request) =>
    ngHapiEngine({
      bootstrap: HelloWorldServerModuleNgFactory,
      req,
      document: helloworld
    })
});

(async() => {
  await server.register(Inert);

  // Client bundles will be statically served from the built/ directory.
  server.route({
    method: 'GET',
    path: '/built/{file*}',
    handler: {
      directory: {
        path: 'built'
      }
    }
  });
  
  await server.start();
})();
