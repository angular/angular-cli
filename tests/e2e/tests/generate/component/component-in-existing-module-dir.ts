import { join } from 'path';
import { ng } from '../../../utils/process';
import { expectFileToMatch } from '../../../utils/fs';

export default function () {
  const modulePath = join('src', 'app', 'foo', 'foo.module.ts');

  return Promise.resolve()
    .then(() => ng('generate', 'module', 'foo'))
    .then(() => ng('generate', 'component', 'foo'))
    .then(() => expectFileToMatch(modulePath, /import { FooComponent } from '.\/foo.component'/));
}
