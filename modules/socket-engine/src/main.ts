/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { NgModuleFactory, StaticProvider, Type } from '@angular/core';
import { ɵCommonEngine as CommonEngine,
  ɵRenderOptions as RenderOptions } from '@nguniversal/common/engine';
import * as net from 'net';

/**
 * @deprecated use `@nguniversal/common` instead.
 */
export interface SocketEngineServer {
  close: () => void;
}

/**
 * @deprecated use `@nguniversal/common` instead.
 */
export interface SocketEngineRenderOptions extends RenderOptions {
  id: number;
}
/**
 * @deprecated use `@nguniversal/common` instead.
 */
export interface SocketEngineResponse {
  id: number;
  html: string|null;
  error?: Error;
}

/**
 * @deprecated use `@nguniversal/common` instead.
 */
export function startSocketEngine(
  moduleOrFactory: Type<{}> | NgModuleFactory<{}>,
  providers: StaticProvider[] = [],
  host = 'localhost',
  port = 9090
): Promise<SocketEngineServer> {
  return new Promise((resolve, _reject) => {
    const engine = new CommonEngine(moduleOrFactory, providers);

    const server = net.createServer(socket => {
      socket.on('data', async buff => {
        const message = buff.toString();
        const renderOptions = JSON.parse(message) as SocketEngineRenderOptions;
        try {
          const html = await engine.render(renderOptions);
          socket.write(JSON.stringify({html, id: renderOptions.id} as SocketEngineResponse));
        } catch (error) {
          // send the error down to the client then rethrow it
          socket.write(JSON.stringify({
            html: null,
            id: renderOptions.id,
            error: error.toString(),
          } as SocketEngineResponse));
        }
      });
    });

    server.listen(port, host);
    resolve({close: () => server.close()});
  });
}

