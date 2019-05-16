import {updateTsConfig} from '../../utils/project';
import {writeMultipleFiles, appendToFile, createDir, replaceInFile} from '../../utils/fs';
import {ng} from '../../utils/process';
import {stripIndents} from 'common-tags';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return updateTsConfig(json => {
    json['compilerOptions']['baseUrl'] = './src';
    json['compilerOptions']['paths'] = {
      '@shared': [
        'app/shared'
      ],
      '@shared/*': [
        'app/shared/*'
      ],
      '@root/*': [
        './*'
      ]
    };
  })
  .then(() => createDir('src/app/shared'))
  .then(() => writeMultipleFiles({
    'src/meaning-too.ts': 'export var meaning = 42;',
    'src/app/shared/meaning.ts': 'export var meaning = 42;',
    'src/app/shared/index.ts': `export * from './meaning'`,
  }))
  .then(() => replaceInFile('src/app/app.module.ts', './app.component', '@root/app/app.component'))
  .then(() => ng('build'))
  .then(() => updateTsConfig(json => {
    json['compilerOptions']['paths']['*'] = [
      '*',
      'app/shared/*'
    ];
  }))
  .then(() => appendToFile('src/app/app.component.ts', stripIndents`
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
  `))
  .then(() => ng('build'));
}
