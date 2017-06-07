import {join} from 'path';
import {testGenerate} from '../../../utils/generate';


export default function() {
  const directiveDir = join('src', 'app');

  return testGenerate({
    blueprint: 'directive',
    name: 'basic',
    pathsToVerify: [
      join(directiveDir, 'basic.directive.ts'),
      join(directiveDir, 'basic.directive.spec.ts')
    ]
  });
}
