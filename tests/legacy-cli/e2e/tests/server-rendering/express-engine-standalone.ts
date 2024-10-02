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
    build.options.outputMode = undefined;
  });

  await writeMultipleFiles({
    'src/server.ts': `
    import { APP_BASE_HREF } from '@angular/common';
    import { CommonEngine } from '@angular/ssr/node';
    import express from 'express';
    import { fileURLToPath } from 'node:url';
    import { dirname, join, resolve } from 'node:path';
    import bootstrap from './src/main.server';

    // The Express app is exported so that it can be used by serverless Functions.
    export function app(): express.Express {
      const server = express();
      const serverDistFolder = dirname(fileURLToPath(import.meta.url));
      const browserDistFolder = resolve(serverDistFolder, '../browser');
      const indexHtml = join(serverDistFolder, 'index.server.html');

      const commonEngine = new CommonEngine();

      server.set('view engine', 'html');
      server.set('views', browserDistFolder);

      server.get('**', express.static(browserDistFolder, {
        maxAge: '1y',
        index: 'index.html',
      }));

      // All regular routes use the Angular engine
      server.get('**', (req, res, next) => {
        const { protocol, originalUrl, baseUrl, headers } = req;

        commonEngine
          .render({
            bootstrap,
            documentFilePath: indexHtml,
            url: \`\${protocol}://\${headers.host}\${originalUrl}\`,
            publicPath: browserDistFolder,
            providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
          })
          .then((html) => res.send(html))
          .catch((err) => next(err));
      });

      return server;
    }

    function run(): void {
      const port = process.env['PORT'] || 4000;
      const server = app();
      server.listen(port, () => {
        console.log(\`Node Express server listening on http://localhost:\${port}\`);
      });
    }

    run();
    `,
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
      });`,
    'src/app/app.component.css': `div { color: #000 }`,
    'src/styles.css': `* { color: #000 }`,
    'src/main.ts': `import { bootstrapApplication } from '@angular/platform-browser';
      import { AppComponent } from './app/app.component';
      import { appConfig } from './app/app.config';

      (window as any)['doBootstrap'] = () => {
        bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
      };
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
