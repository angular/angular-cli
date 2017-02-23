import * as express from 'express';
import * as http from 'http';

import { appendToFile, writeMultipleFiles } from '../../utils/fs';
import {
  killAllProcesses,
  silentExecAndWaitForOutputToMatch,
  waitForAnyProcessOutputToMatch
} from '../../utils/process';
import { wait } from '../../utils/utils';


export default function () {
  const protractorGoodRegEx = /Spec started/;
  const webpackGoodRegEx = /webpack: Compiled successfully./;

  // Create an express api for the Angular app to call.
  const app = express();
  const server = http.createServer(app);
  let liveReloadCount = 0;
  let liveReloadClientCalled = false;
  function resetApiVars() {
    liveReloadCount = 0;
    liveReloadClientCalled = false;
  }

  server.listen(0);
  app.set('port', server.address().port);
  const apiUrl = `http://localhost:${server.address().port}`;

  // This endpoint will be pinged by the main app on each reload.
  app.get('/live-reload-count', _ => liveReloadCount++);
  // This endpoint will be pinged by webpack to check for live reloads.
  app.get('/sockjs-node/info', _ => liveReloadClientCalled = true);


  return Promise.resolve()
    .then(_ => writeMultipleFiles({
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
    .then(_ => wait(1000))
    .then(_ => appendToFile('src/main.ts', 'console.log(1);'))
    .then(_ => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 5000))
    .then(_ => wait(1000))
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
    .then(_ => wait(1000))
    .then(_ => appendToFile('src/main.ts', 'console.log(1);'))
    .then(_ => waitForAnyProcessOutputToMatch(webpackGoodRegEx, 5000))
    .then(_ => wait(1000))
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
    .then(_ => silentExecAndWaitForOutputToMatch(
      'ng',
      ['e2e', '--watch', `--live-reload-client=${apiUrl}`],
      protractorGoodRegEx
    ))
    .then(_ => wait(2000))
    .then(_ => {
      if (!liveReloadClientCalled) {
        throw new Error(`Expected live-reload client to have been called but it was not.`);
      }
    })
    .then(_ => killAllProcesses(), (err) => { killAllProcesses(); throw err; })
    .then(_ => server.close(), (err) => { server.close(); throw err; });
}
