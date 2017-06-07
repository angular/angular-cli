import {join} from 'path';
import {testGenerate} from '../../../utils/generate';


export default function() {
  // Create the pipe in the same directory.
  const pipeDir = join('src', 'app');

  return testGenerate({
    blueprint: 'pipe',
    name: 'basic',
    pathsToVerify: [
      pipeDir,
      join(pipeDir, 'basic.pipe.ts'),
      join(pipeDir, 'basic.pipe.spec.ts')
    ]
  });
}
