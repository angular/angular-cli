import { getGlobalVariable } from '../../utils/env';
import { rimraf, writeMultipleFiles } from '../../utils/fs';
import { findFreePort } from '../../utils/network';
import { installWorkspacePackages } from '../../utils/packages';
import { execAndWaitForOutputToMatch, killAllProcesses, ng } from '../../utils/process';
import { updateJsonFile, useSha } from '../../utils/project';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];

  // forcibly remove in case another test doesn't clean itself up
  await rimraf('node_modules/@angular/ssr');
  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');

  await useSha();
  await installWorkspacePackages();

  if (!useWebpackBuilder) {
    // Disable prerendering
    await updateJsonFile('angular.json', (json) => {
      const build = json['projects']['test-project']['architect']['build'];
      build.configurations.production.prerender = false;
    });
  }

  await writeMultipleFiles({
    'src/styles.css': `* { color: #000 }`,
    'src/main.ts': `
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      (window as any)['doBootstrap'] = () => {
        platformBrowserDynamic()
          .bootstrapModule(AppModule)
          .catch((err) => console.error(err));
      };
    `,
    'e2e/src/app.e2e-spec.ts':
      `
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
          await browser.waitForAngularEnabled(false);
        });

        it('should display: Welcome', async () => {
          // Load the page without waiting for Angular since it is not bootstrapped automatically.
          await browser.driver.get(browser.baseUrl);

          const style = await browser.driver.findElement(by.css('style[ng-app-id="ng"]'));
          expect(await style.getText()).not.toBeNull();

          // Test the contents from the server.
          const serverDiv = await browser.driver.findElement(by.css('div'));
          expect(await serverDiv.getText()).toMatch('Welcome');

          // Bootstrap the client side app.
          await browser.executeScript('doBootstrap()');

          // Retest the contents after the client bootstraps.
          expect(await element(by.css('div')).getText()).toMatch('Welcome');

          // Make sure the server styles got replaced by client side ones.
          expect(await element(by.css('style[ng-app-id="ng"]')).isPresent()).toBeFalsy();
          expect(await element(by.css('style')).getText()).toMatch('');

          // Make sure there were no client side errors.
          await verifyNoBrowserErrors();
        });` +
      // TODO(alanagius): enable the below tests once critical css inlining for SSR is supported with Vite.
      (useWebpackBuilder
        ? `
          it('stylesheets should be configured to load asynchronously', async () => {
            // Load the page without waiting for Angular since it is not bootstrapped automatically.
            await browser.driver.get(browser.baseUrl);

            // Test the contents from the server.
            const styleTag = await browser.driver.findElement(by.css('link[rel="stylesheet"]'));
            expect(await styleTag.getAttribute('media')).toMatch('all');

            // Make sure there were no client side errors.
            await verifyNoBrowserErrors();
          });`
        : '') +
      `
        });
      `,
  });

  async function ngDevSsr(): Promise<number> {
    const port = await findFreePort();
    const validBundleRegEx = useWebpackBuilder ? /Compiled successfully\./ : /complete\./;

    await execAndWaitForOutputToMatch(
      'ng',
      [
        'run',
        `test-project:${useWebpackBuilder ? 'serve-ssr' : 'serve'}:production`,
        '--port',
        String(port),
      ],
      validBundleRegEx,
    );

    return port;
  }

  try {
    const port = await ngDevSsr();
    await ng('e2e', `--base-url=http://localhost:${port}`, '--dev-server-target=');
  } finally {
    await killAllProcesses();
  }
}
