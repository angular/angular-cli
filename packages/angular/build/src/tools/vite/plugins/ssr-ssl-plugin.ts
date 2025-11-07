/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { Plugin } from 'vite';

export function createAngularServerSideSSLPlugin(): Plugin {
  return {
    name: 'angular-ssr-ssl-plugin',
    apply: 'serve',
    async configureServer({ config, httpServer }) {
      console.log('config server');
      const {
        ssr,
        server: { https },
      } = config;

      if (!ssr || !https) {
        return;
      }

      const { getGlobalDispatcher, setGlobalDispatcher, Agent } = await import('undici');
      const originalDispatcher = getGlobalDispatcher();

      setGlobalDispatcher(
        new Agent({
          connect: {
            ca: [...getCerts(https.key), ...getCerts(https.cert)].join('\n'),
          },
        }),
      );

      httpServer?.on('close', () => {
        console.log('setting original');
        setGlobalDispatcher(originalDispatcher);
      });
    },
  };
}

function getCerts(
  items: string | Buffer | (string | Buffer | { pem: string | Buffer })[] | undefined,
): string[] {
  if (!items) {
    return [];
  }

  const certs: string[] = [];
  if (Array.isArray(items)) {
    for (const item of items) {
      const value = typeof item === 'string' ? item : item.toString('utf-8');
      certs.push(value.trim());
    }
  } else {
    const value = typeof items === 'string' ? items : items.toString('utf-8');
    certs.push(value.trim());
  }

  return certs;
}
