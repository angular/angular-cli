import { prependToFile, writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function () {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  await writeMultipleFiles({
    './projects/test-project/src/app/foo.ts': `
      export const foo = 'fooo';
    `,
    './projects/test-project/src/app/bar.ts': `
      import { foo } from './foo';

      console.log(foo);
    `
  }),

  await prependToFile('projects/test-project/src/app/app.module.ts', `import './bar';\n`);

  await ng('build');
  await ng('build', '--aot');
}
