import {join} from 'path';
import {testGenerate} from '../../../utils/generate';
import {updateJsonFile} from '../../../utils/project';


export default function() {
  const componentDir = join('src', 'app');
  return Promise.resolve()
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const comp = configJson.defaults.component;
      comp.flat = true;
    }))
    .then(() => testGenerate({
      blueprint: 'component',
      name: 'flat',
      pathsToVerify: [
        componentDir,
        join(componentDir, 'flat.component.ts'),
        join(componentDir, 'flat.component.spec.ts'),
        join(componentDir, 'flat.component.html'),
        join(componentDir, 'flat.component.css')
      ],
    }));
}
