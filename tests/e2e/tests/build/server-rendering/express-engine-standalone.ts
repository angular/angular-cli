import { getGlobalVariable } from '../../../utils/env';
import { rimraf, writeMultipleFiles } from '../../../utils/fs';
import { findFreePort } from '../../../utils/network';
import { installWorkspacePackages } from '../../../utils/packages';
import { execAndWaitForOutputToMatch, ng } from '../../../utils/process';
import { updateJsonFile, updateServerFileForEsbuild, useSha } from '../../../utils/project';
import { executeBrowserTest } from '../../../utils/puppeteer';

export default async function () {
  // forcibly remove in case another test doesn't clean itself up
  await rimraf('node_modules/@angular/ssr');

  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');

  if (!useWebpackBuilder) {
    // Disable prerendering
    await updateJsonFile('angular.json', (json) => {
      const build = json['projects']['test-project']['architect']['build'];
      build.options.outputMode = undefined;
    });

    await updateServerFileForEsbuild('src/server.ts');
  }

  await useSha();
  await installWorkspacePackages();

  await writeMultipleFiles({
    'src/app/app.css': `div { color: #000 }`,
    'src/styles.css': `* { color: #000 }`,
    'src/main.ts': `import { bootstrapApplication } from '@angular/platform-browser';
      import { App } from './app/app';
      import { appConfig } from './app/app.config';

      (window as any)['doBootstrap'] = () => {
        bootstrapApplication(App, appConfig).catch((err) => console.error(err));
      };
      `,
  });

  async function spawnServer(): Promise<number> {
    const port = await findFreePort();
    const runCommand = useWebpackBuilder ? 'serve:ssr' : 'serve:ssr:test-project';

    await execAndWaitForOutputToMatch(
      'npm',
      ['run', runCommand],
      /Node Express server listening on/,
      {
        ...process.env,
        'PORT': String(port),
      },
    );

    return port;
  }

  await ng('build');
  if (useWebpackBuilder) {
    // Build server code
    await ng('run', `test-project:server`);
  }

  const port = await spawnServer();
  await executeBrowserTest({
    baseUrl: `http://localhost:${port}/`,
    checkFn: async (page) => {
      // Test the contents from the server.
      const h1Text = await page.$eval('h1', (el) => el.textContent);
      if (!h1Text?.includes('Hello')) {
        throw new Error(`Expected h1 to contain 'Hello', but got '${h1Text}'`);
      }

      const serverStylePresent = await page.evaluate(
        `!!document.querySelector('style[ng-app-id="ng"]')`,
      );
      if (!serverStylePresent) {
        throw new Error('Expected server-side style to be present');
      }

      // stylesheets should be configured to load asynchronously
      const linkMedia = await page.$eval('link[rel="stylesheet"]', (el) =>
        el.getAttribute('media'),
      );
      if (linkMedia !== 'all') {
        throw new Error(`Expected link media to be 'all', but got '${linkMedia}'`);
      }

      // Bootstrap the client side app.
      await page.evaluate('window.doBootstrap()');

      // Wait for server style to be removed by client
      await page.waitForSelector('style[ng-app-id="ng"]', { hidden: true });

      // Retest the contents after the client bootstraps.
      const h1TextPost = await page.$eval('h1', (el) => el.textContent);
      if (!h1TextPost?.includes('Hello')) {
        throw new Error(`Expected h1 to contain 'Hello' after bootstrap, but got '${h1TextPost}'`);
      }
    },
  });
}
