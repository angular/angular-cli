import * as os from 'os';
import * as _ from 'lodash';
import * as express from 'express';
import * as http from 'http';

import {appendToFile, writeMultipleFiles, writeFile} from '../../utils/fs';
import {
  killAllProcesses,
  silentExecAndWaitForOutputToMatch,
  waitForAnyProcessOutputToMatch
} from '../../utils/process';
import { wait } from '../../utils/utils';


export default function () {
  const protractorGoodRegEx = /Jasmine started/;
  const webpackGoodRegEx = /webpack: Compiled successfully./;

  // Create an express api for the Angular app to call.
  const app = express();
  const server = http.createServer(app);
  let liveReloadCount = 0;
  function resetApiVars() {
    liveReloadCount = 0;
  }

  server.listen(0);
  app.set('port', server.address().port);

  const firstLocalIp = _(os.networkInterfaces())
    .values()
    .flatten()
    .filter({ family: 'IPv4', internal: false })
    .map('address')
    .first();
  const publicHost = `${firstLocalIp}:4200`;

  const apiUrl = `http://localhost:${server.address().port}`;

  // This endpoint will be pinged by the main app on each reload.
  app.get('/live-reload-count', _ => liveReloadCount++);

  const proxyConfigFile = 'proxy.config.json';
  const proxyConfig = {
    '/live-reload-count': {
      target: apiUrl
    }
  };

  return Promise.resolve()
    .then(_ => writeMultipleFiles({
      'src/app/app.module.ts': `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';
        import { FormsModule } from '@angular/forms';
        import { HttpModule } from '@angular/http';
        import { AppComponent } from './app.component';
        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule,
            FormsModule,
            HttpModule
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `,
      // e2e test that just opens the page and waits, so that the app runs.
      './e2e/app.e2e-spec.ts': `
        import { browser } from 'protractor';

        describe('master-project App', function() {
          it('should wait', _ => {
            browser.get('/');
            browser.sleep(30000);
          });
        });
      `,
      // App that calls the express server once.
      './src/app/app.component.ts': `
        import { Component } from '@angular/core';
        import { Http } from '@angular/http';

        @Component({
          selector: 'app-root',
          template: '<h1>Live reload test</h1>'
        })
        export class AppComponent {
          constructor(private http: Http) {
            http.get('${apiUrl + '/live-reload-count'}').subscribe(res => null);
          }
        }
      `
    }))
    .then(_ => silentExecAndWaitForOutputToMatch(
      'ng',
      ['e2e', '--watch', '--live-reload'],
      protractorGoodRegEx
    ))
    // Let app run.
    .then(_ => wait(2000))
    .then(_ => appendToFile('src/main.ts', 'console.log(1);'))
    .then(_ => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 5000))
    .then(_ => wait(2000))
    .then(_ => {
      if (liveReloadCount != 2) {
        throw new Error(
          `Expected API to have been called 2 times but it was called ${liveReloadCount} times.`
        );
      }
    })
    .then(_ => killAllProcesses(), (err) => { killAllProcesses(); throw err; })
    .then(_ => resetApiVars())
    // Serve with live reload off should call api only once.
    .then(_ => silentExecAndWaitForOutputToMatch(
      'ng',
      ['e2e', '--watch', '--no-live-reload'],
      protractorGoodRegEx
    ))
    .then(_ => wait(2000))
    .then(_ => appendToFile('src/main.ts', 'console.log(1);'))
    .then(_ => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 5000))
    .then(_ => wait(2000))
    .then(_ => {
      if (liveReloadCount != 1) {
        throw new Error(
          `Expected API to have been called 1 time but it was called ${liveReloadCount} times.`
        );
      }
    })
    .then(_ => killAllProcesses(), (err) => { killAllProcesses(); throw err; })
    .then(_ => resetApiVars())
    // Serve with live reload client set to api should call api.
    .then(() => writeFile(proxyConfigFile, JSON.stringify(proxyConfig, null, 2)))
    // Update the component to call the webserver
    .then(() => writeFile('./src/app/app.component.ts',
      `
        import { Component } from '@angular/core';
        import { Http } from '@angular/http';
        @Component({
          selector: 'app-root',
          template: '<h1>Live reload test</h1>'
        })
        export class AppComponent {
          constructor(private http: Http) {
            http.get('http://${publicHost + '/live-reload-count'}').subscribe(res => null);
          }
        }`))
    .then(_ => silentExecAndWaitForOutputToMatch(
      'ng',
      ['e2e', '--watch', '--host=0.0.0.0', '--port=4200', `--public-host=${publicHost}`, '--proxy', proxyConfigFile],
      protractorGoodRegEx
    ))
    .then(_ => wait(2000))
    .then(_ => appendToFile('src/main.ts', 'console.log(1);'))
    .then(_ => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 5000))
    .then(_ => wait(2000))
    .then(_ => {
      if (liveReloadCount != 2) {
        throw new Error(
          `Expected API to have been called 2 times but it was called ${liveReloadCount} times.`
        );
      }
    })
    .then(_ => killAllProcesses(), (err) => { killAllProcesses(); throw err; })
    .then(_ => server.close(), (err) => { server.close(); throw err; });
}
