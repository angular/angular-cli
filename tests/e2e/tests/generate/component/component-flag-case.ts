import {join} from 'path';
import {ng} from '../../../utils/process';
import {expectFileToMatch} from '../../../utils/fs';


export default function() {
  const compDir = join('src', 'app', 'test');

  return Promise.resolve()
    .then(() => ng('generate', 'component', 'test', '-cd', 'onpush', '-ve', 'emulated'))
    .then(() => expectFileToMatch(join(compDir, 'test.component.ts'),
      /changeDetection: ChangeDetectionStrategy.OnPush/))
    .then(() => expectFileToMatch(join(compDir, 'test.component.ts'),
      /encapsulation: ViewEncapsulation.Emulated/));
}
