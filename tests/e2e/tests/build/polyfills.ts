import { expectFileToMatch } from '../../utils/fs';
import { ng } from '../../utils/process';
import { getGlobalVariable } from '../../utils/env';
import { oneLineTrim } from 'common-tags';

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => ng('build'))
    // files were created successfully
    .then(() => expectFileToMatch('dist/polyfills.bundle.js', 'core-js'))
    .then(() => expectFileToMatch('dist/polyfills.bundle.js', 'zone.js'))
    // index.html lists the right bundles
    .then(() => expectFileToMatch('dist/index.html', oneLineTrim`
      <script type="text/javascript" src="inline.bundle.js"></script>
      <script type="text/javascript" src="polyfills.bundle.js"></script>
    `));
}
