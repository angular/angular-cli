import {join} from 'path';
import {expectFileToMatch} from '../../../utils/fs';
import {testGenerate} from '../../../utils/generate';


export default function() {
  const appDir = join('src', 'app');

  return testGenerate({
    blueprint: 'guard',
    name: 'module',
    flags: ['--module', 'app.module.ts']
  })
  .then(() => expectFileToMatch(join(appDir, 'app.module.ts'),
    /import { ModuleGuard } from '.\/module.guard'/))
  .then(() => expectFileToMatch(join(appDir, 'app.module.ts'),
    /providers:\s*\[ModuleGuard\]/m));
}
