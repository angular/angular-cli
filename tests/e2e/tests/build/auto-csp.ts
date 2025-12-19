import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { getGlobalVariable } from '../../utils/env';
import { expectFileToMatch, writeFile, writeMultipleFiles } from '../../utils/fs';
import { findFreePort } from '../../utils/network';
import { execAndWaitForOutputToMatch, ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { executeBrowserTest } from '../../utils/puppeteer';

const CSP_META_TAG = /<meta http-equiv="Content-Security-Policy"/;

export default async function () {
  assert(
    getGlobalVariable('argv')['esbuild'],
    'This test should not be called in the Webpack suite.',
  );

  // Add global css to trigger critical css inlining
  await writeFile('src/styles.css', `body { color: green }`);

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
  });

  async function spawnServer(): Promise<number> {
    const port = await findFreePort();

    await execAndWaitForOutputToMatch('node', ['serve.js'], /Node Express server listening on/, {
      ...process.env,
      'PORT': String(port),
    });

    return port;
  }

  await ng('build');

  // Make sure the output files have auto-CSP as a result of `ng build`
  await expectFileToMatch('dist/test-project/browser/index.html', CSP_META_TAG);

  // Make sure if contains the critical CSS inlining CSP code.
  await expectFileToMatch('dist/test-project/browser/index.html', 'ngCspMedia');

  // Make sure that our e2e tests run to confirm that our angular project runs.
  const port = await spawnServer();
  await executeBrowserTest({
    baseUrl: `http://localhost:${port}/`,
    checkFn: async (page) => {
      const warnMessages: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'warning') {
          warnMessages.push(msg.text());
        }
      });

      // Reload to ensure we capture messages from the start if needed,
      // although executeBrowserTest already navigated.
      await page.reload();

      // Wait for the expected number of warnings
      let retries = 50;
      while (warnMessages.length < 4 && retries > 0) {
        await setTimeout(100);
        retries--;
      }

      assert.strictEqual(
        warnMessages.length,
        4,
        `Expected 4 console warnings, but got ${warnMessages.length}:\n${warnMessages.join('\n')}`,
      );

      const expectedMessages = [
        'Inline Script Head',
        'Inline Script Body: 1339',
        'First External Script: 1338',
        'Second External Script: 1337',
      ];

      for (let i = 0; i < expectedMessages.length; i++) {
        if (!warnMessages[i].includes(expectedMessages[i])) {
          assert.fail(
            `Expected warning ${i} to include '${expectedMessages[i]}', but got '${warnMessages[i]}'`,
          );
        }
      }
    },
  });
}
