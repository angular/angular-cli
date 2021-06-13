import { stripIndents } from 'common-tags';
import { appendToFile, createDir, replaceInFile, rimraf, writeMultipleFiles } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateTsConfig } from '../../utils/project';

export default async function () {
  await updateTsConfig(json => {
    json['compilerOptions']['baseUrl'] = './src';
    json['compilerOptions']['paths'] = {
      '@shared': [
        'app/shared',
      ],
      '@shared/*': [
        'app/shared/*',
      ],
      '@root/*': [
        './*',
      ],
    };
  });

  await createDir('src/app/shared');
  await writeMultipleFiles({
    'src/meaning-too.ts': 'export var meaning = 42;',
    'src/app/shared/meaning.ts': 'export var meaning = 42;',
    'src/app/shared/index.ts': `export * from './meaning'`,
  });

  await replaceInFile('src/app/app.module.ts', './app.component', '@root/app/app.component');
  await ng('build', '--configuration=development');

  await updateTsConfig(json => {
    json['compilerOptions']['paths']['*'] = [
      '*',
      'app/shared/*',
    ];
  });

  await appendToFile('src/app/app.component.ts', stripIndents`
    import { meaning } from 'app/shared/meaning';
    import { meaning as meaning2 } from '@shared';
    import { meaning as meaning3 } from '@shared/meaning';
    import { meaning as meaning4 } from 'meaning';
    import { meaning as meaning5 } from 'meaning-too';

    // need to use imports otherwise they are ignored and
    // no error is outputted, even if baseUrl/paths don't work
    console.log(meaning)
    console.log(meaning2)
    console.log(meaning3)
    console.log(meaning4)
    console.log(meaning5)
  `);

  await ng('build', '--configuration=development');

  // Simulate no package.json file which causes Webpack to have an undefined 'descriptionFileData'.
  await rimraf('package.json');
  await ng('build', '--configuration=development');
}
