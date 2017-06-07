import {join} from 'path';
import {testGenerate} from '../../../utils/generate';


export default function() {
  const moduleDir = join('src', 'app', 'test');

  return testGenerate({
    blueprint: 'module',
    name: 'test',
    flags: ['--routing'],
    pathsToVerify: [
      moduleDir,
      join(moduleDir, 'test.module.ts'),
      join(moduleDir, 'test-routing.module.ts'),
      '!' + join(moduleDir, 'test.spec.ts')
    ]
  });
}
