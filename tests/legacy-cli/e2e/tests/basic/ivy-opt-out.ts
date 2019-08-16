/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { getGlobalVariable } from '../../utils/env';
import { request } from '../../utils/http';
import { killAllProcesses, ng } from '../../utils/process';
import { ngServe, updateJsonFile } from '../../utils/project';

export default async function() {
  if (getGlobalVariable('argv')['ve']) {
    // Don't run this test for VE jobs. It only applies to Ivy.
    return;
  }

  try {
    // trigger an Ivy builds to process packages with NGCC
    await ng('e2e', '--prod');

    // View Engine (NGC) compilation should work after running NGCC from Webpack
    await updateJsonFile('tsconfig.json', config => {
      config.angularCompilerOptions.enableIvy = false;
    });

    // verify that VE compilation works during runtime
    await ng('e2e', '--prod');

    // verify that it is not Ivy
    await ngServe('--prod');
    // Verify the index.html
    const body = await request('http://localhost:4200/');
    if (!body.match(/<app-root><\/app-root>/)) {
      throw new Error('Response does not match expected value.');
    }

    // Verify it's compiled with NGC
    const mainUrlMatch = body.match(/src="(main\.[a-z0-9]{0,32}\.js)"/);
    const mainUrl = mainUrlMatch && mainUrlMatch[1];
    const main = await request('http://localhost:4200/' + mainUrl);

    if (main.match(/ngComponentDef\s*=/)) {
      throw new Error('Loaded Ivy but expected View Engine applicatiom.');
    }

  } finally {
    await killAllProcesses();
  }
}
