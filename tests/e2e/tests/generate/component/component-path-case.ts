import {join} from 'path';
import {testGenerate} from '../../../utils/generate';


export default function() {
  const upperDirs = join('non', 'existing', 'dir');
  const rootDir = join('src', 'app', upperDirs);


  const componentDir = join(rootDir, 'test-component');
  const componentTwoDir = join(rootDir, 'test-component-two');

  return testGenerate({
    blueprint: 'component',
    name: `${upperDirs}/test-component`,
    pathsToVerify: [
      componentDir,
      join(componentDir, 'test-component.component.ts'),
      join(componentDir, 'test-component.component.spec.ts'),
      join(componentDir, 'test-component.component.html'),
      join(componentDir, 'test-component.component.css')
    ]
  })
  .then(() => testGenerate({
    blueprint: 'component',
    name: `${upperDirs}/Test-Component-Two`,
    pathsToVerify: [
      join(componentTwoDir, 'test-component-two.component.ts'),
      join(componentTwoDir, 'test-component-two.component.spec.ts'),
      join(componentTwoDir, 'test-component-two.component.html'),
      join(componentTwoDir, 'test-component-two.component.css')
    ]
  }));
}
