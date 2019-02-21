/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { appendToFile, createDir, replaceInFile, writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function () {
  // console.warn has to be used because chrome only captures warnings and errors by default
  // https://github.com/angular/protractor/issues/2207
  await createDir('./src/worker');
  await writeMultipleFiles({
    './src/app/dep.ts': `export const foo = 'bar';`,
    './src/app/app.worker.ts': `
      import 'typescript/lib/lib.webworker';
      import { foo } from './dep';
      console.warn('hello from worker');
      addEventListener('message', ({ data }) => {
        console.warn(\`worker got message: \${ data }\`);
        if (data === 'hello') {
          postMessage(foo);
        }
      });
    `,
    './src/tsconfig.worker.json': `
      {
        "extends": "../tsconfig.json",
        "compilerOptions": {
          "outDir": "../out-tsc/worker",
          "lib": [
            "es2018",
            "webworker"
          ],
          "types": []
        },
        "include": [
          "**/*.worker.ts",
        ]
      }`,
    './src/tsconfig.app.json': `
      {
        "extends": "../tsconfig.json",
        "compilerOptions": {
          "outDir": "../out-tsc/worker",
          "types": []
        },
        "exclude": [
          "test.ts",
          "**/*.spec.ts",
          "**/*.worker.ts",
        ]
      }`,
    './e2e/app.e2e-spec.ts': `
      import { browser } from 'protractor';

      describe('worker bundle', function() {
        it('should log worker messages', () => {
          page.navigateTo();
          const logs = await browser.manage().logs().get(logging.Type.BROWSER);
          expect(logs.length).toEqual(3);
          expect(logs[0].message).toContain('hello from worker');
          expect(logs[1].message).toContain('worker got message: hello');
          expect(logs[2].message).toContain('page got message: bar');
        });
      });
    `,
  });

  await appendToFile('./src/main.ts', `
    const worker = new Worker('./app/app.worker.ts', { type: 'module' });
    worker.onmessage = ({ data }) => {
      console.warn(\`page got message: \${ data }\`);
    };
    worker.postMessage('hello');
  `);

  await replaceInFile('./angular.json',`"tsConfig": "src/tsconfig.app.json",`,
    `"tsConfig": "src/tsconfig.app.json",
    "experimentalWebWorkerTsConfig": "src/tsconfig.worker.json",`,
  );

  await ng('e2e');
}
