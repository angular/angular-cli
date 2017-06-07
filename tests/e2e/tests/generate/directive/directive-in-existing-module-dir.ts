import { join } from 'path';
import { expectFileToMatch } from '../../../utils/fs';
import {testGenerate} from '../../../utils/generate';

export default function () {
  const modulePath = join('src', 'app', 'foo', 'foo.module.ts');

  return testGenerate({blueprint: 'module', name: 'foo'})
    .then(() => testGenerate({blueprint: 'directive', name: 'foo', flags: ['--no-flat']}))
    .then(() => expectFileToMatch(modulePath, /import { FooDirective } from '.\/foo.directive'/));
}
