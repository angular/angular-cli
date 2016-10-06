import {isMobileTest} from '../../utils/utils';
import {expectFileToMatch, expectFileToExist} from '../../utils/fs';


export default function() {
  if (!isMobileTest()) {
    return;
  }

  return Promise.resolve()
    .then(() => expectFileToMatch('dist/index.html', `<app-root>
  <h1>
    app works!
  </h1>
  </app-root>`))
    .then(() => expectFileToExist('dist/manifest.webapp'));
}
