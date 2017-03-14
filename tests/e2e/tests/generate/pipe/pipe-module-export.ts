import {join} from 'path';
import {expectFileToMatch} from '../../../utils/fs';
import {testGenerate} from '../../../utils/generate';


export default function() {
  const modulePath = join('src', 'app', 'app.module.ts');

  return testGenerate({blueprint: 'pipe', name: 'export', flags: ['--export']})
    .then(() => expectFileToMatch(modulePath, 'exports: [ExportPipe]'));
}
