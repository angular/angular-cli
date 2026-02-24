/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { getCACertificates, setDefaultCACertificates } from 'node:tls';
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

      if (httpServer && 'ALPNProtocols' in httpServer) {
        // Force Vite to use HTTP/1.1 when SSR and SSL are enabled.
        // This is required because the Express server used for SSR does not support HTTP/2.
        // See: https://github.com/vitejs/vite/blob/46d3077f2b63771cc50230bc907c48f5773c00fb/packages/vite/src/node/http.ts#L126

        // We directly set the `ALPNProtocols` on the HTTP server to override the default behavior.
        // Passing `ALPNProtocols` in the TLS options would cause Node.js to automatically include `h2`.
        // Additionally, using `ALPNCallback` is not an option as it is mutually exclusive with `ALPNProtocols`.
        // See: https://github.com/nodejs/node/blob/b8b4350ed3b73d225eb9e628d69151df56eaf298/lib/internal/http2/core.js#L3351
        httpServer.ALPNProtocols = ['http/1.1'];
      }

      const { cert } = https;
      const additionalCerts = Array.isArray(cert) ? cert : [cert];

      const currentCerts = getCACertificates('default');
      setDefaultCACertificates([...currentCerts, ...additionalCerts]);
    },
  };
}
