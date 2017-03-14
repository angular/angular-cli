import {join} from 'path';
import {testGenerate} from '../../../utils/generate';
import {expectFileToMatch} from '../../../utils/fs';

export default function() {
  const componentName = 'flag-case';
  const compDir = join('src', 'app', componentName);
  return testGenerate({
      blueprint: 'component',
      name: componentName,
      flags: ['-cd', 'onpush', '-ve', 'emulated']
    })
    .then(() => expectFileToMatch(join(compDir, `${componentName}.component.ts`),
      /changeDetection: ChangeDetectionStrategy.OnPush/))
    .then(() => expectFileToMatch(join(compDir, `${componentName}.component.ts`),
      /encapsulation: ViewEncapsulation.Emulated/));
}
