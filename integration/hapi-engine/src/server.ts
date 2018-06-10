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
import * as Hapi from 'hapi';
import * as Inert from 'inert';

import {HelloWorldServerModuleNgFactory} from './helloworld/app.server.ngfactory';
import {Base_Reply} from 'hapi';
const helloworld = require('raw-loader!./helloworld/index.html');

const server = new Hapi.Server();
server.connection({ port: 9876, host: 'localhost' });
server.register(Inert, () => {});

enableProdMode();

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

// Keep the browser logs free of errors.
server.route({
  method: 'GET',
  path: '/favicon.ico',
  handler: function (request, reply) {
    reply('');
  }
});

//-----------ADD YOUR SERVER SIDE RENDERED APP HERE ----------------------
server.route({
  method: 'GET',
  path: '/helloworld',
  handler: (req: Request, reply: Base_Reply) => {
    ngHapiEngine({
      bootstrap: HelloWorldServerModuleNgFactory,
      req,
      document: helloworld
    } as any).then(html => reply(html));
  }
});

server.start((err) => {
  if (err) {
    throw err;
  }
  console.log('Server listening on port 9876!');
});
