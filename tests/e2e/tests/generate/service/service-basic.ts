import {join} from 'path';
import {testGenerate} from '../../../utils/generate';


export default function() {
  // Does not create a sub directory.
  const serviceDir = join('src', 'app');

  return testGenerate({
    blueprint: 'service',
    name: 'basic',
    pathsToVerify: [
      serviceDir,
      join(serviceDir, 'basic.service.ts'),
      join(serviceDir, 'basic.service.spec.ts')
    ]
  });
}
