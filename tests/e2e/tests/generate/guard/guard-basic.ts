import {join} from 'path';
import {testGenerate} from '../../../utils/generate';

export default function() {
  const guardDir = join('src', 'app');

  return testGenerate({
      blueprint: 'guard',
      name: 'basic',
      pathsToVerify: [
        guardDir,
        join(guardDir, 'basic.guard.ts'),
        join(guardDir, 'basic.guard.spec.ts')
      ],
    });
}
