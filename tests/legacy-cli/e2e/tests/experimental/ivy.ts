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

    await ngServe('--aot');

    // Verify the index.html
    const body = await request('http://localhost:4200/');
    if (!body.match(/<app-root><\/app-root>/)) {
      throw new Error('Response does not match expected value.');
    }

    // Verify it's Ivy.
    const main = await request('http://localhost:4200/main.js');
    if (!main.match(/ngComponentDef/)) {
      throw new Error('Ivy could not be found.');
    }
  } finally {
    await killAllProcesses();
  }
}

