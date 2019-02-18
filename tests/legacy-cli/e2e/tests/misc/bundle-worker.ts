import { writeMultipleFiles, appendToFile } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function () {
  // console.warn has to be used because chrome only captures warnings and errors by default
  // https://github.com/angular/protractor/issues/2207
  await writeMultipleFiles({
    './src/dep.js': `export const foo = 'bar';`,
    './src/worker.js': `
      import { foo } from './dep';

      console.warn('hello from worker');

      addEventListener('message', ({ data }) => {
        console.warn(\`worker got message: \${ data }\`);
        if (data === 'hello') {
          postMessage(foo);
        }
      });
    `,
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
    const worker = new Worker('./worker', { type: 'module' });
    worker.onmessage = ({ data }) => {
      console.warn(\`page got message: \${ data }\`);
    };
    worker.postMessage('hello');
  `);

  await ng('e2e');
}
