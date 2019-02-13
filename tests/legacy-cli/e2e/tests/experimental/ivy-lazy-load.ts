/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { readdirSync } from 'fs';
import { prependToFile, replaceInFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { createProject } from '../../utils/project';

export default async function() {
  await createProject('ivy-project', '--experimental-ivy');

  await ng('generate', 'module', 'lazy', '--routing');
  await prependToFile('src/app/app.module.ts', `import { RouterModule } from '@angular/router';`);
  await replaceInFile('src/app/app.module.ts', 'imports: [', `imports: [
    RouterModule.forRoot([{ path: "lazy", loadChildren: "src/app/lazy/lazy.module#LazyModule" }]),
  `);
  await ng('build', '--named-chunks', '--aot');
  const distFiles = await readdirSync('dist/ivy-project');
  if (!distFiles.includes('lazy-lazy-module.js')
    || distFiles.includes('lazy-lazy-module-ngfactory.js')) {
    throw new Error('The lazy module chunk should not be a ngfactory.');
  }
}
