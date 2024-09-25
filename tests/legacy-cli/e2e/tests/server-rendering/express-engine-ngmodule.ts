import { rimraf, writeMultipleFiles } from '../../utils/fs';
import { findFreePort } from '../../utils/network';
import { installWorkspacePackages } from '../../utils/packages';
import { execAndWaitForOutputToMatch, ng } from '../../utils/process';
import { updateJsonFile, useCIChrome, useCIDefaults, useSha } from '../../utils/project';

export default async function () {
  // forcibly remove in case another test doesn't clean itself up
  await rimraf('node_modules/@angular/ssr');

  await ng('generate', 'app', 'test-project-two', '--no-standalone', '--skip-install');
  await ng('generate', 'e2e', '--related-app-name=test-project-two');

  // Setup testing to use CI Chrome.
  await useCIChrome('test-project-two', 'projects/test-project-two/e2e/');
  await useCIDefaults('test-project-two');

  await ng(
    'add',
    '@angular/ssr',
    '--skip-confirmation',
    '--skip-install',
    '--project=test-project-two',
  );

  await useSha();
  await installWorkspacePackages();

  // Disable prerendering
  await updateJsonFile('angular.json', (json) => {
    const build = json['projects']['test-project-two']['architect']['build'];
    build.configurations.production.prerender = false;
  });

  await writeMultipleFiles({
    'projects/test-project-two/src/app/app.component.css': `div { color: #000 }`,
    'projects/test-project-two/src/styles.css': `* { color: #000 }`,
    'projects/test-project-two/src/main.ts': `
      import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
      import { AppModule } from './app/app.module';

      (window as any)['doBootstrap'] = () => {
        platformBrowserDynamic()
          .bootstrapModule(AppModule)
          .catch((err) => console.error(err));
      };
    `,
    'projects/test-project-two/e2e/src/app.e2e-spec.ts': `
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
          const serverDiv = await browser.driver.findElement(by.css('h1'));
          expect(await serverDiv.getText()).toMatch('Hello');

          // Bootstrap the client side app.
          await browser.executeScript('doBootstrap()');

          // Retest the contents after the client bootstraps.
          expect(await element(by.css('h1')).getText()).toMatch('Hello');

          // Make sure the server styles got replaced by client side ones.
          expect(await element(by.css('style[ng-app-id="ng"]')).isPresent()).toBeFalsy();
          expect(await element(by.css('style')).getText()).toMatch('');

          // Make sure there were no client side errors.
          await verifyNoBrowserErrors();
        });

        it('stylesheets should be configured to load asynchronously', async () => {
          // Load the page without waiting for Angular since it is not bootstrapped automatically.
          await browser.driver.get(browser.baseUrl);

          // Test the contents from the server.
          const styleTag = await browser.driver.findElement(by.css('link[rel="stylesheet"]'));
          expect(await styleTag.getAttribute('media')).toMatch('all');

          // Make sure there were no client side errors.
          await verifyNoBrowserErrors();
        });
      });
      `,
  });

  async function spawnServer(): Promise<number> {
    const port = await findFreePort();
    await execAndWaitForOutputToMatch(
      'npm',
      ['run', 'serve:ssr:test-project-two'],
      /Node Express server listening on/,
      {
        'PORT': String(port),
      },
    );

    return port;
  }

  await ng('build', 'test-project-two');

  const port = await spawnServer();
  await ng(
    'e2e',
    '--project=test-project-two',
    `--base-url=http://localhost:${port}`,
    '--dev-server-target=',
  );
}
