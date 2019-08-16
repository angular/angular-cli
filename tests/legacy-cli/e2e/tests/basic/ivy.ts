/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { getGlobalVariable } from '../../utils/env';
import { expectFileToExist, replaceInFile } from '../../utils/fs';
import { request } from '../../utils/http';
import { killAllProcesses, ng } from '../../utils/process';
import { ngServe } from '../../utils/project';

export default async function() {
  if (getGlobalVariable('argv')['ve']) {
    // Don't run this test for VE jobs. It only applies to Ivy.
    return;
  }

  try {
    // Add in a reference to a secondary entry-point to check that ngcc processes it correctly
    await replaceInFile(
      'src/app/app.module.ts',
      `import { AppComponent } from './app.component';`,
      `import { AppComponent } from './app.component';\nimport { HttpClientModule } from '@angular/common/http';`,
    );
    await replaceInFile('src/app/app.module.ts', `imports: [`, `imports: [\n    HttpClientModule,`);

    await ngServe('--prod');

    // Check that @angular/common/http was processed by ngcc
    await expectFileToExist('node_modules/@angular/common/http/http.d.ts.__ivy_ngcc_bak');

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
    killAllProcesses();
  }
}
