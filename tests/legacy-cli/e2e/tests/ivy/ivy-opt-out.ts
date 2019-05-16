/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { replaceInFile } from '../../utils/fs';
import { request } from '../../utils/http';
import { killAllProcesses, ng } from '../../utils/process';
import { createProject, ngServe } from '../../utils/project';

export default async function() {
  try {
    await createProject('ivy-project-opt-out', '--enable-ivy');
    // trigger an Ivy builds to process packages with NGCC
    await ng('e2e', '--prod');

    // View Engine (NGC) compilation should work after running NGCC from Webpack
    await replaceInFile('tsconfig.app.json', '"enableIvy": true', '"enableIvy": false');

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
