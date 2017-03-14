import {join} from 'path';
import {updateJsonFile} from '../../../utils/project';
import {testGenerate} from '../../../utils/generate';


export default function() {
  const componentDir = join('src', 'app', 'not-flat');
  return updateJsonFile('.angular-cli.json', configJson => {
      const comp = configJson.defaults.component;
      comp.flat = false;
    })
    .then(() => testGenerate({
      blueprint: 'component',
      name: 'not-flat',
      pathsToVerify: [
        componentDir,
        join(componentDir, 'not-flat.component.ts'),
        join(componentDir, 'not-flat.component.spec.ts'),
        join(componentDir, 'not-flat.component.html'),
        join(componentDir, 'not-flat.component.css')
      ]
    }));
}
