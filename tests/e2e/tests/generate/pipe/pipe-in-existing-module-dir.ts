import {join} from 'path';
import {expectFileToMatch} from '../../../utils/fs';
import {testGenerate} from '../../../utils/generate';

export default function () {
  const modulePath = join('src', 'app', 'foo', 'foo.module.ts');

  return testGenerate({blueprint: 'module', name: 'foo'})
    .then(() => testGenerate({blueprint: 'pipe', name: 'foo', flags: ['--no-flat']}))
    .then(() => expectFileToMatch(modulePath, /import { FooPipe } from '.\/foo.pipe'/));
}
