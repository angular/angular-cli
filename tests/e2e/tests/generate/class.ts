import {join} from 'path';
import {testGenerate} from '../../utils/generate';


export default function() {
  const classDir = join('src', 'app');

  return testGenerate({
    blueprint: 'class',
    name: 'basic',
    flags: ['--spec'],
    pathsToVerify: [
      classDir,
      join(classDir, 'basic.ts'),
      join(classDir, 'basic.spec.ts')
    ]
  });
}
