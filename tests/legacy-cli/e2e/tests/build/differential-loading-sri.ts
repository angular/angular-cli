import { createHash } from 'crypto';
import {
  appendToFile,
  expectFileToMatch,
  prependToFile,
  readFile,
  replaceInFile,
  writeFile,
} from '../../utils/fs';
import { ng } from '../../utils/process';

export default async function () {
  // Enable Differential loading
  await replaceInFile('.browserslistrc', 'not IE 11', 'IE 11');

  const appRoutingModulePath = 'src/app/app-routing.module.ts';

  // Add app routing.
  // This is done automatically on a new app with --routing.
  await writeFile(
    appRoutingModulePath,
    `
    import { NgModule } from '@angular/core';
    import { Routes, RouterModule } from '@angular/router';

    const routes: Routes = [];

    @NgModule({
      imports: [RouterModule.forRoot(routes)],
      exports: [RouterModule]
    })
    export class AppRoutingModule { }
  `,
  );
  await prependToFile(
    'src/app/app.module.ts',
    `import { AppRoutingModule } from './app-routing.module';`,
  );
  await replaceInFile('src/app/app.module.ts', `imports: [`, `imports: [ AppRoutingModule,`);
  await appendToFile('src/app/app.component.html', '<router-outlet></router-outlet>');

  await ng('generate', 'module', 'lazy', '--module=app.module', '--route', 'lazy');

  await ng(
    'build',
    '--subresource-integrity',
    '--output-hashing=none',
    '--output-path=dist/first',
  );

  // Second build used to ensure cached files use correct integrity values
  await ng(
    'build',
    '--subresource-integrity',
    '--output-hashing=none',
    '--output-path=dist/second',
  );

  const chunkId = '730';
  const codeHashES5 = createHash('sha384')
    .update(await readFile(`dist/first/${chunkId}-es5.js`))
    .digest('base64');
  const codeHashes2017 = createHash('sha384')
    .update(await readFile(`dist/first/${chunkId}-es2017.js`))
    .digest('base64');

  await expectFileToMatch('dist/first/runtime-es5.js', 'sha384-' + codeHashES5);
  await expectFileToMatch('dist/first/runtime-es2017.js', 'sha384-' + codeHashes2017);

  await expectFileToMatch('dist/second/runtime-es5.js', 'sha384-' + codeHashES5);
  await expectFileToMatch('dist/second/runtime-es2017.js', 'sha384-' + codeHashes2017);
}
