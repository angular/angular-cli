import { setTimeout } from 'node:timers/promises';
import { getGlobalVariable } from '../../utils/env';
import { appendToFile, replaceInFile, writeMultipleFiles } from '../../utils/fs';
import { silentNg, waitForAnyProcessOutputToMatch } from '../../utils/process';
import { ngServe } from '../../utils/project';

export default async function () {
  const esbuild = getGlobalVariable('argv')['esbuild'];
  const validBundleRegEx = esbuild ? /sent to client/ : /Compiled successfully\./;
  const lazyBundleRegEx = esbuild ? /chunk-/ : /src_app_lazy_lazy_component_ts\.js/;

  // Disable HMR to support page reload based rebuild testing.
  const port = await ngServe('--no-hmr');

  // Add a lazy route.
  await silentNg('generate', 'component', 'lazy');

  // Should trigger a rebuild with a new bundle.
  // We need to use Promise.all to ensure we are waiting for the rebuild just before we write
  // the file, otherwise rebuilds can be too fast and fail CI.
  // Count the bundles.
  // Verify that a new chunk was created.
  await Promise.all([
    waitForAnyProcessOutputToMatch(lazyBundleRegEx),
    replaceInFile(
      'src/app/app.routes.ts',
      'routes: Routes = [];',
      `routes: Routes = [{path: 'lazy', loadComponent: () => import('./lazy/lazy.component').then(c => c.LazyComponent)}];`,
    ),
  ]);

  // Change multiple files and check that all of them are invalidated and recompiled.
  await setTimeout(500);
  await Promise.all([
    waitForAnyProcessOutputToMatch(validBundleRegEx),
    appendToFile(
      'src/app/app.routes.ts',
      `
        console.log('$$_E2E_GOLDEN_VALUE_1');
        export let X = '$$_E2E_GOLDEN_VALUE_2';
      `,
    ),
    appendToFile(
      'src/main.ts',
      `
        import * as m from './app/app.routes';
        console.log(m.X);
        console.log('$$_E2E_GOLDEN_VALUE_3');
        `,
    ),
  ]);

  await setTimeout(500);
  await Promise.all([
    waitForAnyProcessOutputToMatch(validBundleRegEx),
    writeMultipleFiles({
      'src/app/app.routes.ts': `
        import { Routes } from '@angular/router';

        export const routes: Routes = [];

        console.log('$$_E2E_GOLDEN_VALUE_1');
        export let X = '$$_E2E_GOLDEN_VALUE_2';
        console.log('File changed with no import/export changes');
        `,
    }),
  ]);
  {
    const response = await fetch(`http://localhost:${port}/main.js`);
    const body = await response.text();
    if (!body.match(/\$\$_E2E_GOLDEN_VALUE_1/)) {
      throw new Error('Expected golden value 1.');
    }
    if (!body.match(/\$\$_E2E_GOLDEN_VALUE_2/)) {
      throw new Error('Expected golden value 2.');
    }
    if (!body.match(/\$\$_E2E_GOLDEN_VALUE_3/)) {
      throw new Error('Expected golden value 3.');
    }
  }

  await setTimeout(500);
  await Promise.all([
    waitForAnyProcessOutputToMatch(validBundleRegEx),
    writeMultipleFiles({
      'src/app/app.component.ng.html': '<h1>testingTESTING123</h1>',
    }),
  ]);

  {
    const response = await fetch(`http://localhost:${port}/main.js`);
    const body = await response.text();
    if (!body.match(/testingTESTING123/)) {
      throw new Error('Expected component HTML to update.');
    }
  }

  await setTimeout(500);
  await Promise.all([
    waitForAnyProcessOutputToMatch(validBundleRegEx),
    writeMultipleFiles({
      'src/app/app.component.css': ':host { color: blue; }',
    }),
  ]);

  {
    const response = await fetch(`http://localhost:${port}/main.js`);
    const body = await response.text();
    if (!body.match(/color:\s?blue/)) {
      throw new Error('Expected component CSS to update.');
    }
  }

  await setTimeout(500);
  await Promise.all([
    waitForAnyProcessOutputToMatch(validBundleRegEx),
    writeMultipleFiles({
      'src/styles.css': 'div { color: green; }',
    }),
  ]);

  {
    const response = await fetch(`http://localhost:${port}/styles.css`);
    const body = await response.text();
    if (!body.match(/color:\s?green/)) {
      throw new Error('Expected global CSS to update.');
    }
  }
}
