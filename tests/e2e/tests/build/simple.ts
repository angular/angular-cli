import {ng} from '../../utils/process';
import {expectFileToMatch} from '../../utils/fs';

export default function() {
  return ng('build')
    .then(() => expectFileToMatch('__DIST__/apps/myapp/bundles/main.bundle.js',
      /bootstrapModuleFactory/));
}
