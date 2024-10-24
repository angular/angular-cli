import assert from 'node:assert';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, rimraf, writeMultipleFiles } from '../../utils/fs';
import { findFreePort } from '../../utils/network';
import { installWorkspacePackages } from '../../utils/packages';
import { execAndWaitForOutputToMatch, ng } from '../../utils/process';
import { updateJsonFile, updateServerFileForWebpack, useSha } from '../../utils/project';

const MULTI_HASH_CSP =
  /script-src 'strict-dynamic' (?:'sha256-[^']+' )+https: 'unsafe-inline';object-src 'none';base-uri 'self';/;

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );
  // forcibly remove in case another test doesn't clean itself up
  // await rimraf('node_modules/@angular/ssr');
  // We don't need SSR yet but eventually for when Auto-CSP will also have a SSR implementation.
  // await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');

  await useSha();
  await installWorkspacePackages();

  // Turn on auto-CSP
  await updateJsonFile('angular.json', (json) => {
    const build = json['projects']['test-project']['architect']['build'];
    build.options = {
      ...build.options,
      security: { autoCsp: true },
    };
  });

  await writeMultipleFiles({
    'serve.js': `
    const express = require('express');
    const path = require('path');

    const app = express();
    const PORT = process.env.PORT || 3000;

    app.use(express.static(path.join(__dirname, 'dist/test-project/browser')));

    app.listen(PORT, () => {
      console.log('Node Express server listening on ' + PORT);
    });
    `,
    'src/index.html': `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <base href="/">
        <script>console.log("Inline Script Head");</script>
      </head>
      <body>
        <app-root></app-root>
        <script>console.log("Inline Script Body");</script>
      </body>
      </html>
    `,
    'e2e/src/app.e2e-spec.ts': `
      import { browser, by, element } from 'protractor';
      import * as webdriver from 'selenium-webdriver';

      function verifyNoBrowserErrors() {
        return browser
          .manage()
          .logs()
          .get('browser')
          .then(function (browserLog: any[]) {
            const errors: any[] = [];
            browserLog.filter((logEntry) => {
              const msg = logEntry.message;
              console.log('>> ' + msg);
              if (logEntry.level.value >= webdriver.logging.Level.INFO.value) {
                errors.push(msg);
              }
            });
            expect(errors).toEqual([]);
          });
      }

      describe('Hello world E2E Tests', () => {
        beforeAll(async () => {
          await browser.waitForAngularEnabled(true);
        });

        it('should display: Welcome', async () => {
          // Load the page without waiting for Angular since it is not bootstrapped automatically.
          await browser.driver.get(browser.baseUrl);

          // expect(
          //   await element(by.css('style[ng-app-id="ng"]')).getText()
          // ).not.toBeNull();

          // Test the contents.
          expect(await element(by.css('h1')).getText()).toMatch('Hello');

          // Make sure the server styles got replaced by client side ones.
          expect(
            await element(by.css('style[ng-app-id="ng"]')).isPresent()
          ).toBeFalsy();
          expect(await element(by.css('style')).getText()).toMatch('');

          // Make sure there were no client side errors.
          await verifyNoBrowserErrors();
        });
      });
      `,
  });

  async function spawnServer(): Promise<number> {
    const port = await findFreePort();

    await execAndWaitForOutputToMatch('node', ['serve.js'], /Node Express server listening on/, {
      'PORT': String(port),
    });

    return port;
  }

  await ng('build');

  // Make sure the output files have auto-CSP as a result of `ng build`
  await expectFileToMatch('dist/test-project/browser/index.html', MULTI_HASH_CSP);

  // Make sure that our e2e protractor tests run to confirm that our angular project runs.
  const port = await spawnServer();
  await ng('e2e', `--base-url=http://localhost:${port}`, '--dev-server-target=');
}
