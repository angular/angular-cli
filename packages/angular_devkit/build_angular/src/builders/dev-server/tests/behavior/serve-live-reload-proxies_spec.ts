/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/* eslint-disable import/no-extraneous-dependencies */
import { tags } from '@angular-devkit/core';
import { createServer } from 'node:http';
import path from 'node:path';
import { createProxyServer } from 'http-proxy';
import { AddressInfo } from 'node:net';
import { setTimeout as setTimeoutPromise } from 'node:timers/promises';
import puppeteer, { Browser, Page } from 'puppeteer';
import { executeDevServer } from '../../index';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const document: any;

interface ProxyInstance {
  server: typeof createProxyServer extends () => infer R ? R : never;
  url: string;
}

function findFreePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('listening', () => {
      const port = (server.address() as AddressInfo).port;
      server.close((e) => (e ? reject(e) : resolve(port)));
    });
    server.once('error', (e) => server.close(() => reject(e)));
    server.listen();
  });
}

async function createProxy(target: string, secure: boolean, ws = true): Promise<ProxyInstance> {
  const proxyPort = await findFreePort();
  const server = createProxyServer({
    ws,
    target,
    secure,
    ssl: secure && {
      key: tags.stripIndents`
      -----BEGIN PRIVATE KEY-----
      MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgEpythQjrJo9bm8GM
      LFacGutCqc/XxDZ3dDkSMYZYZ2ehRANCAARvwtZ3OwP1uLhrcLp7nemvaWqkA+FN
      NDjOA3OZKhyVHYog1jNTawJJjwk66upbXGFL8622yU1INWbZFxvrSANl
      -----END PRIVATE KEY-----
    `,
      cert: tags.stripIndents`
      -----BEGIN CERTIFICATE-----
      MIIBfzCCASWgAwIBAgIUUoRhwzxAE3y5nrOW8de+cJEIVvQwCgYIKoZIzj0EAwIw
      FDESMBAGA1UEAwwJbG9jYWxob3N0MCAXDTI2MTAxOTA4NTUyNVoYDzIxMjYwOTI1
      MDg1NTI1WjAUMRIwEAYDVQQDDAlsb2NhbGhvc3QwWTATBgcqhkjOPQIBBggqhkjO
      PQMBBwNCAARvwtZ3OwP1uLhrcLp7nemvaWqkA+FNNDjOA3OZKhyVHYog1jNTawJJ
      jwk66upbXGFL8622yU1INWbZFxvrSANlo1MwUTAdBgNVHQ4EFgQUWyqB1QeFcs6L
      LL7Utsybm6+XFvIwHwYDVR0jBBgwFoAUWyqB1QeFcs6LLL7Utsybm6+XFvIwDwYD
      VR0TAQH/BAUwAwEB/zAKBggqhkjOPQQDAgNIADBFAiBazry25W+Qewb/WzadhmdY
      YDGdshNZCk0g0DI3ctNjlgIhAKm2X8pmqdkM38Yh8QDN0cHBsAcDfRYffDnjJ3tP
      dpnU
      -----END CERTIFICATE-----
    `,
    },
  }).listen(proxyPort);

  server.on('error', () => {
    // Ignore proxy connection errors that occur when the browser reloads or disconnects.
  });

  return {
    server,
    url: `${secure ? 'https' : 'http'}://localhost:${proxyPort}`,
  };
}

async function waitForAppLiveReload(page: Page): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < 30_000) {
    try {
      const text = await page.evaluate(() => document.querySelector('p')?.innerText);
      if (text === 'app-live-reload') {
        return;
      }
    } catch {
      // Ignore execution context destruction errors during page navigation.
    }
    await setTimeoutPromise(100);
  }

  throw new Error('Timed out waiting for page to reload with updated text.');
}

async function goToPageAndWaitForWS(page: Page, url: string): Promise<void> {
  const baseUrl = url.replace(/^http/, 'ws');
  const socksRequest = baseUrl.at(-1) === '/' ? `${baseUrl}ng-cli-ws` : `${baseUrl}/ng-cli-ws`;
  // Create a Chrome dev tools session so that we can capturing websocket request.
  // https://github.com/puppeteer/puppeteer/issues/2974

  // We do this, to ensure that we make the right request with the expected host, port etc...
  const client = await page.target().createCDPSession();
  await client.send('Network.enable');
  await client.send('Page.enable');

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`A Websocket connected to ${socksRequest} was not established.`)),
        2000,
      );
      client.on('Network.webSocketCreated', ({ url }) => {
        if (url.startsWith(socksRequest)) {
          clearTimeout(timeout);
          resolve();
        }
      });
    }),
    page.goto(url),
  ]);

  await client.detach();
}

describeServeBuilder(
  executeDevServer,
  DEV_SERVER_BUILDER_INFO,
  (harness, setupTarget, isViteRun) => {
    // TODO(fix-vite): currently this is broken in vite.
    (isViteRun ? xdescribe : describe)(
      'Behavior: "Dev-server builder live-reload with proxies"',
      () => {
        let browser: Browser;
        let page: Page;

        const SERVE_OPTIONS = Object.freeze({
          ...BASE_OPTIONS,
          hmr: false,
          watch: true,
          liveReload: true,
        });

        beforeAll(async () => {
          browser = await puppeteer.launch({
            executablePath: process.env.CHROME_BIN
              ? path.resolve(path.join(process.cwd(), '..', '..', '..'), process.env.CHROME_BIN)
              : undefined,
            acceptInsecureCerts: true,
            args: ['--no-sandbox', '--disable-gpu'],
          });
        });

        afterAll(async () => {
          await browser.close();
        });

        beforeEach(async () => {
          setupTarget(harness, {
            polyfills: ['src/polyfills.ts'],
          });

          page = await browser.newPage();
        });

        afterEach(async () => {
          await page.close();
        });

        it('works without proxy', async () => {
          harness.useTarget('serve', {
            ...SERVE_OPTIONS,
          });

          await harness.writeFile('src/app/app.component.html', '<p>{{ title }}</p>');

          await harness.executeWithCases([
            async ({ result }) => {
              expect(result?.success).toBeTrue();
              if (typeof result?.baseUrl !== 'string') {
                throw new Error('Expected "baseUrl" to be a string.');
              }

              await goToPageAndWaitForWS(page, result.baseUrl);
              await harness.modifyFile('src/app/app.component.ts', (content) =>
                content.replace(`'app'`, `'app-live-reload'`),
              );
            },
            async ({ result }) => {
              expect(result?.success).toBeTrue();

              await waitForAppLiveReload(page);

              const innerText = await page.evaluate(() => document.querySelector('p').innerText);
              expect(innerText).toBe('app-live-reload');
            },
          ]);
        });

        it('works without http -> http proxy', async () => {
          harness.useTarget('serve', {
            ...SERVE_OPTIONS,
          });

          await harness.writeFile('src/app/app.component.html', '<p>{{ title }}</p>');

          let proxy: ProxyInstance | undefined;
          try {
            await harness.executeWithCases(
              [
                async ({ result }) => {
                  expect(result?.success).toBeTrue();
                  if (typeof result?.baseUrl !== 'string') {
                    throw new Error('Expected "baseUrl" to be a string.');
                  }

                  proxy = await createProxy(result.baseUrl, false);
                  await goToPageAndWaitForWS(page, proxy.url);
                  await harness.modifyFile('src/app/app.component.ts', (content) =>
                    content.replace(`'app'`, `'app-live-reload'`),
                  );
                },
                async ({ result }) => {
                  expect(result?.success).toBeTrue();

                  await waitForAppLiveReload(page);

                  const innerText = await page.evaluate(
                    () => document.querySelector('p').innerText,
                  );
                  expect(innerText).toBe('app-live-reload');
                },
              ],
              { timeout: 50_000 },
            );
          } finally {
            proxy?.server.close();
          }
        });

        it('works without https -> http proxy', async () => {
          harness.useTarget('serve', {
            ...SERVE_OPTIONS,
          });

          await harness.writeFile('src/app/app.component.html', '<p>{{ title }}</p>');

          let proxy: ProxyInstance | undefined;

          try {
            await harness.executeWithCases(
              [
                async ({ result }) => {
                  expect(result?.success).toBeTrue();
                  if (typeof result?.baseUrl !== 'string') {
                    throw new Error('Expected "baseUrl" to be a string.');
                  }

                  proxy = await createProxy(result.baseUrl, true);
                  await goToPageAndWaitForWS(page, proxy.url);
                  await harness.modifyFile('src/app/app.component.ts', (content) =>
                    content.replace(`'app'`, `'app-live-reload'`),
                  );
                },
                async ({ result }) => {
                  expect(result?.success).toBeTrue();

                  await waitForAppLiveReload(page);

                  const innerText = await page.evaluate(
                    () => document.querySelector('p').innerText,
                  );
                  expect(innerText).toBe('app-live-reload');
                },
              ],
              { timeout: 50_000 },
            );
          } finally {
            proxy?.server.close();
          }
        });
      },
    );
  },
);
