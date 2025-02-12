import assert from 'node:assert';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, writeMultipleFiles } from '../../utils/fs';
import { findFreePort } from '../../utils/network';
import { execAndWaitForOutputToMatch, ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

const CSP_META_TAG = /<meta http-equiv="Content-Security-Policy"/;

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

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
    'public/script1.js': `
    const externalScriptCreated = 1337;
    console.warn('First External Script: ' + inlineScriptBodyCreated);
    `,
    'public/script2.js': `console.warn('Second External Script: ' + externalScriptCreated);`,
    'src/index.html': `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <base href="/">
        <script>
          const inlineScriptHeadCreated = 1339;
          console.warn("Inline Script Head");
        </script>
      </head>
      <body>
        <app-root></app-root>
        
        <script>
          const inlineScriptBodyCreated = 1338;
          console.warn("Inline Script Body: " + inlineScriptHeadCreated);
        </script>
        <script src='script1.js'></script>
        <script src='script2.js'></script>
        </body>
      </html>
    `,
    'e2e/src/app.e2e-spec.ts': `
      import { browser, by, element } from 'protractor';
      import * as webdriver from 'selenium-webdriver';

      function allConsoleWarnMessagesAndErrors() {
        return browser
          .manage()
          .logs()
          .get('browser')
          .then(function (browserLog: any[]) {
            const warnMessages: any[] = [];
            browserLog.filter((logEntry) => {
              const msg = logEntry.message;
              console.log('>> ' + msg);
              if (logEntry.level.value >= webdriver.logging.Level.INFO.value) {
                warnMessages.push(msg);
              }
            });
            return warnMessages;
          });
      }

      describe('Hello world E2E Tests', () => {
        beforeAll(async () => {
          await browser.waitForAngularEnabled(true);
        });

        it('should display: Welcome and run all scripts in order', async () => {
          // Load the page without waiting for Angular since it is not bootstrapped automatically.
          await browser.driver.get(browser.baseUrl);

          // Test the contents.
          expect(await element(by.css('h1')).getText()).toMatch('Hello');

          // Make sure all scripts ran and there were no client side errors.
          const consoleMessages = await allConsoleWarnMessagesAndErrors();
          expect(consoleMessages.length).toEqual(4); // No additional errors
          // Extract just the printed messages from the console data.
          const printedMessages = consoleMessages.map(m => m.match(/"(.*?)"/)[1]);
          expect(printedMessages).toEqual([
            // All messages printed in order because execution order is preserved.
            "Inline Script Head",
            "Inline Script Body: 1339",
            "First External Script: 1338",
            "Second External Script: 1337",
          ]);
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
  await expectFileToMatch('dist/test-project/browser/index.html', CSP_META_TAG);

  // Make sure that our e2e protractor tests run to confirm that our angular project runs.
  const port = await spawnServer();
  await ng('e2e', `--base-url=http://localhost:${port}`, '--dev-server-target=');
}
