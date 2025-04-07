import { ng } from '../../../utils/process';
import { getGlobalVariable } from '../../../utils/env';
import { rimraf, writeMultipleFiles } from '../../../utils/fs';
import { match } from 'node:assert';
import { expectToFail } from '../../../utils/utils';
import { useSha } from '../../../utils/project';
import { installWorkspacePackages } from '../../../utils/packages';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  if (useWebpackBuilder) {
    return;
  }

  // Forcibly remove in case another test doesn't clean itself up.
  await rimraf('node_modules/@angular/ssr');
  await ng('add', '@angular/ssr', '--skip-confirmation');
  await useSha();
  await installWorkspacePackages();

  await writeMultipleFiles({
    'src/app/app.ts': `
      import { Component } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { RouterOutlet } from '@angular/router';

      @Component({
        selector: 'app-root',
        standalone: true,
        imports: [CommonModule, RouterOutlet],
        templateUrl: './app.html',
        styleUrls: ['./app.css']
      })
      export class App {
      title = 'test-ssr';

      constructor() {
        console.log(window)
      }
    }
  `,
  });

  const { message } = await expectToFail(() =>
    ng('build', '--configuration', 'development', '--prerender'),
  );
  match(
    message,
    // When babel is used it will add names to the sourcemap and `constructor` will be used in the stack trace.
    // This will currently only happen if AOT and script optimizations are set which enables advanced optimizations.
    /window is not defined[.\s\S]*(?:constructor|_App) \(.*app\.ts\:\d+:\d+\)/,
  );
}
