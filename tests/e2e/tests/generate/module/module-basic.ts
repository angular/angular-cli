import {join} from 'path';
import {testGenerate} from '../../../utils/generate';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const moduleDir = join('src', 'app', 'basic');

  return testGenerate({
    blueprint: 'module',
    name: 'basic',
    pathsToVerify: [
      moduleDir,
      join(moduleDir, 'basic.module.ts'),
      '!' + join(moduleDir, 'basic-routing.module.ts'),
      '!' + join(moduleDir, 'basic.spec.ts'),
    ]
  })
  .then(() => expectFileToMatch(join(moduleDir, 'basic.module.ts'), 'BasicModule'))

}
