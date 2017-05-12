import { createProjectFromAsset } from '../../utils/assets';
import { ng } from '../../utils/process';

// This test ensures a project generated with 1.0.0 will still work.
// Only change it test on major releases.

export default function () {
  return Promise.resolve()
    .then(() => createProjectFromAsset('1.0.0-proj'))
    .then(() => ng('generate', 'component', 'my-comp'))
    .then(() => ng('lint'))
    .then(() => ng('test', '--single-run'))
    .then(() => ng('e2e'))
    .then(() => ng('e2e', '--prod'));
}
