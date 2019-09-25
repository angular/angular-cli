import { appendToFile, moveDirectory, prependToFile, replaceInFile, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function () {
  // Store the production build for artifact storage on CircleCI
  if (process.env['CIRCLECI']) {

    // Add initial app routing.
    // This is done automatically on a new app with --routing but must be done manually on
    // existing apps.
    const appRoutingModulePath = 'src/app/app-routing.module.ts';
    await writeFile(appRoutingModulePath, `
      import { NgModule } from '@angular/core';
      import { Routes, RouterModule } from '@angular/router';

      const routes: Routes = [];

      @NgModule({
        imports: [RouterModule.forRoot(routes)],
        exports: [RouterModule]
      })
      export class AppRoutingModule { }
    `);
    await prependToFile('src/app/app.module.ts',
      `import { AppRoutingModule } from './app-routing.module';`);
    await replaceInFile('src/app/app.module.ts', `imports: [`, `imports: [ AppRoutingModule,`);
    await appendToFile('src/app/app.component.html', '<router-outlet></router-outlet>');

    // Add a lazy module.
    await ng('generate', 'module', 'lazy', '--route=lazy', '--module=app.module');

    // Build without hashing and with named chunks to keep have consistent file names.
    await ng('build', '--prod', '--output-hashing=none', '--named-chunks=true');

    // Upload to the store_artifacts dir listed in .circleci/config.yml
    await moveDirectory('dist', '/tmp/dist');
  }
}
