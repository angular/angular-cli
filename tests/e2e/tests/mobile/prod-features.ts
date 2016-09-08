import {isMobileTest, expectToFail} from '../../utils/utils';
import {expectFileToMatch, expectFileToExist} from '../../utils/fs';


export default function() {
  if (!isMobileTest()) {
    return;
  }

  return Promise.resolve()
    // Service Worker
    .then(() => expectToFail(() => expectFileToMatch('dist/index.html',
                                                     'if (\'serviceWorker\' in navigator) {')))
    .then(() => expectToFail(() => expectFileToExist('dist/worker.js')))

    // Asynchronous bundle
    .then(() => expectToFail(() => expectFileToMatch('dist/index.html',
                                                   '<script src="/app-concat.js" async></script>')))
    .then(() => expectToFail(() => expectFileToExist('dist/app-concat.js')));
}
