import { expectFileToMatch, writeFile } from '../../utils/fs';
import { installWorkspacePackages } from '../../utils/packages';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';

export default async function () {
  // Force duplicate modules
  await updateJsonFile('package.json', (json) => {
    json.dependencies = {
      ...json.dependencies,
      'tslib': '2.0.0',
      'tslib-1': 'npm:tslib@1.13.0',
      'tslib-1-copy': 'npm:tslib@1.13.0',
    };
  });

  await installWorkspacePackages();

  await writeFile(
    './src/main.ts',
    `
        import { __assign as __assign_0 } from 'tslib';
        import { __assign as __assign_1 } from 'tslib-1';
        import { __assign as __assign_2 } from 'tslib-1-copy';

        console.log({
            __assign_0,
            __assign_1,
            __assign_2,
        })
    `,
  );

  const { stderr } = await ng(
    'build',
    '--verbose',
    '--no-vendor-chunk',
    '--no-progress',
    '--configuration=development',
  );
  const outFile = 'dist/test-project/main.js';

  if (/\[DedupeModuleResolvePlugin\]:.+tslib-1-copy.+ -> .+tslib-1.+/.test(stderr)) {
    await expectFileToMatch(outFile, './node_modules/tslib-1/tslib.es6.js');
    await expectToFail(() =>
      expectFileToMatch(outFile, './node_modules/tslib-1-copy/tslib.es6.js'),
    );
  } else if (/\[DedupeModuleResolvePlugin\]:.+tslib-1.+ -> .+tslib-1-copy.+/.test(stderr)) {
    await expectFileToMatch(outFile, './node_modules/tslib-1-copy/tslib.es6.js');
    await expectToFail(() => expectFileToMatch(outFile, './node_modules/tslib-1/tslib.es6.js'));
  } else {
    console.error(`\n\n\n${stderr}\n\n\n`);
    throw new Error('Expected stderr to contain [DedupeModuleResolvePlugin] log for tslib.');
  }

  await expectFileToMatch(outFile, './node_modules/tslib/tslib.es6.js');
}
