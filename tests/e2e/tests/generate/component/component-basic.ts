import {join} from 'path';
import {testGenerate} from '../../../utils/generate';


export default function() {
  const componentDir = join('src', 'app', 'basic');
  return testGenerate({
      blueprint: 'component',
      name: 'basic',
      pathsToVerify: [
        componentDir,
        join(componentDir, 'basic.component.ts'),
        join(componentDir, 'basic.component.spec.ts'),
        join(componentDir, 'basic.component.html'),
        join(componentDir, 'basic.component.css')
      ],
    });
}
