import { rimraf, writeMultipleFiles } from '../../utils/fs';
import { findFreePort } from '../../utils/network';
import { installWorkspacePackages } from '../../utils/packages';
import { execAndWaitForOutputToMatch, ng } from '../../utils/process';
import { updateJsonFile, useSha } from '../../utils/project';

export default async function () {
  // forcibly remove in case another test doesn't clean itself up
  await rimraf('node_modules/@angular/ssr');
  await ng('add', '@angular/ssr', '--skip-confirmation', '--skip-install');

  await useSha();
  await installWorkspacePackages();

  await updateJsonFile('angular.json', (json) => {
    const build = json['projects']['test-project']['architect']['build'];
    build.configurations.production.prerender = false;
  });

  await writeMultipleFiles({
    'src/app/app.component.css': `div { color: #000 }`,
    'src/styles.css': `* { color: #000 }`,
    'src/main.ts': `import { bootstrapApplication } from '@angular/platform-browser';
      import { AppComponent } from './app/app.component';
      import { appConfig } from './app/app.config';

      (window as any)['doBootstrap'] = () => {
        bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
      };
      `,
    'src/index.html': `
      <!doctype html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <base href="/">
      </head>
      <body>
        <app-root ngCspNonce="{% nonce %}"></app-root>
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
          await browser.waitForAngularEnabled(false);
        });

        it('should display: Welcome', async () => {
          // Load the page without waiting for Angular since it is not bootstrapped automatically.
          await browser.driver.get(browser.baseUrl);

          expect(
            await element(by.css('style[ng-app-id="ng"]')).getText()
          ).not.toBeNull();

          // Test the contents from the server.
          expect(await element(by.css('h1')).getText()).toMatch('Hello');

          // Bootstrap the client side app.
          await browser.executeScript('doBootstrap()');

          // Retest the contents after the client bootstraps.
          expect(await element(by.css('h1')).getText()).toMatch('Hello');

          // Make sure the server styles got replaced by client side ones.
          expect(
            await element(by.css('style[ng-app-id="ng"]')).isPresent()
          ).toBeFalsy();
          expect(await element(by.css('style')).getText()).toMatch('');

          // Make sure there were no client side errors.
          await verifyNoBrowserErrors();
        });

        it('stylesheets should be configured to load asynchronously', async () => {
          // Load the page without waiting for Angular since it is not bootstrapped automatically.
          await browser.driver.get(browser.baseUrl);

          // Test the contents from the server.
          const linkTag = await browser.driver.findElement(
            by.css('link[rel="stylesheet"]')
          );
          expect(await linkTag.getAttribute('media')).toMatch('all');
          expect(await linkTag.getAttribute('ngCspMedia')).toBeNull();
          expect(await linkTag.getAttribute('onload')).toBeNull();

          // Make sure there were no client side errors.
          await verifyNoBrowserErrors();
        });

        it('style tags all have a nonce attribute', async () => {
          // Load the page without waiting for Angular since it is not bootstrapped automatically.
          await browser.driver.get(browser.baseUrl);

          // Test the contents from the server.
          for (const s of await browser.driver.findElements(by.css('style'))) {
            expect(await s.getAttribute('nonce')).toBe('{% nonce %}');
          }

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
      ['run', 'serve:ssr:test-project'],
      /Node Express server listening on/,
      {
        'PORT': String(port),
      },
    );

    return port;
  }

  await ng('build');

  const port = await spawnServer();
  await ng('e2e', `--base-url=http://localhost:${port}`, '--dev-server-target=');
}
