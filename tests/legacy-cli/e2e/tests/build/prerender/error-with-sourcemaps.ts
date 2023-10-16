import { ng } from '../../../utils/process';
import { getGlobalVariable } from '../../../utils/env';
import { rimraf, writeMultipleFiles } from '../../../utils/fs';
import { match } from 'node:assert';
import { expectToFail } from '../../../utils/utils';

export default async function () {
  const useWebpackBuilder = !getGlobalVariable('argv')['esbuild'];
  if (useWebpackBuilder) {
    return;
  }

  // Forcibly remove in case another test doesn't clean itself up.
  await rimraf('node_modules/@angular/ssr');
  await ng('add', '@angular/ssr', '--skip-confirmation');

  await writeMultipleFiles({
    'src/app/app.component.ts': `
      import { Component } from '@angular/core';
      import { CommonModule } from '@angular/common';
      import { RouterOutlet } from '@angular/router';

      @Component({
        selector: 'app-root',
        standalone: true,
        imports: [CommonModule, RouterOutlet],
        templateUrl: './app.component.html',
        styleUrls: ['./app.component.css']
      })
      export class AppComponent {
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
  match(message, /window is not defined[.\s\S]*constructor \(.*app\.component\.ts\:\d+:\d+\)/);
}
