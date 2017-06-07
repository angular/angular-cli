import {join} from 'path';
import {expectFileToMatch} from '../../../utils/fs';
import {testGenerate} from '../../../utils/generate';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');
  return testGenerate({blueprint: 'component', name: 'mod', flags: ['--module', 'app.module.ts']})
    .then(() => expectFileToMatch(modulePath,
      /import { ModComponent } from '.\/mod\/mod.component'/));
}
