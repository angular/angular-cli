import { prependToFile, writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';


export default async function () {
  await writeMultipleFiles({
    './src/app/foo.ts': `
      export const foo = 'fooo';
    `,
    './src/app/bar.ts': `
      import { foo } from 'app/foo';

      console.log(foo);
    `
  }),

  await prependToFile('src/app/app.module.ts', `import './bar';\n`);

  await ng('build');
  await ng('build', '--aot');
}
