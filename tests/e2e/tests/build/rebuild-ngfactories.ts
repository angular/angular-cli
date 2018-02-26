import {
  killAllProcesses,
  waitForAnyProcessOutputToMatch,
  execAndWaitForOutputToMatch,
} from '../../utils/process';
import { appendToFile, writeMultipleFiles, replaceInFile } from '../../utils/fs';
import { request } from '../../utils/http';
import { getGlobalVariable } from '../../utils/env';

const validBundleRegEx = /: Compiled successfully./;

export default function () {
  if (process.platform.startsWith('win')) {
    return Promise.resolve();
  }
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  // Skip this test in Angular 2/4.
  if (getGlobalVariable('argv').ng2 || getGlobalVariable('argv').ng4) {
    return Promise.resolve();
  }

  return execAndWaitForOutputToMatch('ng', ['serve', '--aot'], validBundleRegEx)
    .then(() => writeMultipleFiles({
      'src/app/app.component.css': `
        @import './imported-styles.css';
        body {background-color: #00f;}
      `,
      'src/app/imported-styles.css': 'p {color: #f00;}',
    }))
    // Trigger a few rebuilds first.
    // The AOT compiler is still optimizing rebuilds on the first rebuild.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
      appendToFile('src/main.ts', 'console.log(1)\n')
    ]))
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
      appendToFile('src/main.ts', 'console.log(1)\n')
    ]))
    // Check if html changes are built.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
      appendToFile('src/app/app.component.html', '<p>HTML_REBUILD_STRING<p>')
    ]))
    .then(() => request('http://localhost:4200/main.js'))
    .then((body) => {
      if (!body.match(/HTML_REBUILD_STRING/)) {
        throw new Error('Expected HTML_REBUILD_STRING but it wasn\'t in bundle.');
      }
    })
    // Check if css changes are built.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
      appendToFile('src/app/app.component.css', 'CSS_REBUILD_STRING {color: #f00;}')
    ]))
    .then(() => request('http://localhost:4200/main.js'))
    .then((body) => {
      if (!body.match(/CSS_REBUILD_STRING/)) {
        throw new Error('Expected CSS_REBUILD_STRING but it wasn\'t in bundle.');
      }
    })
    // Check if css dependency changes are built.
    .then(() => Promise.all([
      waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
      appendToFile('src/app/imported-styles.css', 'CSS_DEP_REBUILD_STRING {color: #f00;}')
    ]))
    .then(() => request('http://localhost:4200/main.js'))
    .then((body) => {
      if (!body.match(/CSS_DEP_REBUILD_STRING/)) {
        throw new Error('Expected CSS_DEP_REBUILD_STRING but it wasn\'t in bundle.');
      }
    })
    .then(() => {
      // Skip this part of the test in Angular 2/4.
      if (getGlobalVariable('argv').ng2 || getGlobalVariable('argv').ng4) {
        return Promise.resolve();
      }

      // Check if component metadata changes are built.
      return Promise.resolve()
        .then(() => Promise.all([
          waitForAnyProcessOutputToMatch(validBundleRegEx, 10000),
          replaceInFile('src/app/app.component.ts', 'app-root', 'app-root-FACTORY_REBUILD_STRING')
        ]))
        .then(() => request('http://localhost:4200/main.js'))
        .then((body) => {
          if (!body.match(/FACTORY_REBUILD_STRING/)) {
            throw new Error('Expected FACTORY_REBUILD_STRING but it wasn\'t in bundle.');
          }
        });
    })
    .then(() => killAllProcesses(), (err: any) => {
      killAllProcesses();
      throw err;
    });
}
