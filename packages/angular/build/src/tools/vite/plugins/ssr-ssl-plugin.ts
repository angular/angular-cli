/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { rootCertificates } from 'node:tls';
import type { Plugin } from 'vite';

export function createAngularServerSideSSLPlugin(): Plugin {
  return {
    name: 'angular-ssr-ssl-plugin',
    apply: 'serve',
    async configureServer({ config, httpServer }) {
      const {
        ssr,
        server: { https },
      } = config;

      if (!ssr || !https?.cert) {
        return;
      }

      // TODO(alanagius): Replace `undici` with `tls.setDefaultCACertificates` once we only support Node.js 22.18.0+ and 24.5.0+.
      // See: https://nodejs.org/api/tls.html#tlssetdefaultcacertificatescerts
      const { getGlobalDispatcher, setGlobalDispatcher, Agent } = await import('undici');
      const originalDispatcher = getGlobalDispatcher();
      const { cert } = https;
      const certificates = Array.isArray(cert) ? cert : [cert];

      setGlobalDispatcher(
        new Agent({
          connect: {
            ca: [...rootCertificates, ...certificates],
          },
        }),
      );

      httpServer?.on('close', () => {
        setGlobalDispatcher(originalDispatcher);
      });
    },
  };
}
