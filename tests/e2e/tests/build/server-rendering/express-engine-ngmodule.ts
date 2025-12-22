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

  await ng('generate', 'app', 'test-project-two', '--no-standalone', '--skip-install');

  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];

  if (useWebpackBuilder) {
    await updateJsonFile('angular.json', (json) => {
      const build = json['projects']['test-project-two']['architect']['build'];
      build.builder = '@angular-devkit/build-angular:browser';
      build.options = {
        ...build.options,
        main: build.options.browser,
        browser: undefined,
        index: 'src/index.html',
      };

      build.configurations.development = {
        ...build.configurations.development,
        vendorChunk: true,
        namedChunks: true,
        buildOptimizer: false,
      };
    });
  }

  await ng(
    'add',
    '@angular/ssr',
    '--skip-confirmation',
    '--skip-install',
    '--project=test-project-two',
  );

  await useSha();
  await installWorkspacePackages();

  if (!useWebpackBuilder) {
    // Disable prerendering
    await updateJsonFile('angular.json', (json) => {
      const build = json['projects']['test-project-two']['architect']['build'];
      build.configurations.production.prerender = false;
      build.options.outputMode = undefined;
    });

    await updateServerFileForEsbuild('projects/test-project-two/src/server.ts');
  }

  await writeMultipleFiles({
    'projects/test-project-two/src/app/app.css': `div { color: #000 }`,
    'projects/test-project-two/src/styles.css': `* { color: #000 }`,
    'projects/test-project-two/src/main.ts': `
      import { platformBrowser } from '@angular/platform-browser';
      import { AppModule } from './app/app-module';

      (window as any)['doBootstrap'] = () => {
        platformBrowser()
          .bootstrapModule(AppModule)
          .catch((err) => console.error(err));
      };
    `,
  });

  async function spawnServer(): Promise<number> {
    const port = await findFreePort();

    const runCommand = useWebpackBuilder ? 'serve:ssr' : `serve:ssr:test-project-two`;

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

  await ng('build', 'test-project-two');

  if (useWebpackBuilder) {
    // Build server code
    await ng('run', `test-project-two:server`);
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
