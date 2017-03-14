import {join} from 'path';
import {testGenerate} from '../../../utils/generate';
import {expectFileToMatch} from '../../../utils/fs';

export default function () {
  const modulePath = join('src', 'app', 'foo', 'foo.module.ts');
  return testGenerate({ blueprint: 'module', name: 'foo' })
    .then(() => testGenerate({ blueprint: 'component', name: 'foo' }))
    .then(() => expectFileToMatch(modulePath,
      /import { FooComponent } from '.\/foo.component'/));
}
