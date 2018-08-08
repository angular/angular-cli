/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { request } from '../../utils/http';
import { killAllProcesses } from '../../utils/process';
import { createProject, ngServe } from '../../utils/project';

export default async function() {
  try {
    await createProject('ivy-project', '--experimental-ivy');

    await ngServe('--prod');

    // Verify the index.html
    const body = await request('http://localhost:4200/');
    if (!body.match(/<app-root><\/app-root>/)) {
      throw new Error('Response does not match expected value.');
    }

    // Verify it's Ivy.
    const mainUrlMatch = body.match(/src="(main\.[a-z0-9]{0,32}\.js)"/);
    const mainUrl = mainUrlMatch && mainUrlMatch[1];
    const main = await request('http://localhost:4200/' + mainUrl);

    if (!main.match(/ngComponentDef\s*=/)) {
      throw new Error('Ivy could not be found.');
    }
    if (main.match(/ngDevMode/)) {
      throw new Error('NgDevMode was not tree shaken away.');
    }
  } finally {
    await killAllProcesses();
  }
}
