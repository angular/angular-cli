import { ng } from '../../utils/process';
import { expectFileToMatch } from '../../utils/fs';


export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.

  return ng('build', '--base-href', '/myUrl')
    .then(() => expectFileToMatch('dist/test-project/index.html', /<base href="\/myUrl">/));
}
