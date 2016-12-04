import { isMobileTest, expectToFail, getClientDist } from '../../utils/utils';
import {expectFileToMatch, expectFileToExist} from '../../utils/fs';


export default function() {
  if (!isMobileTest()) {
    return;
  }

  return Promise.resolve()
    // Service Worker
    .then(() => expectToFail(() => expectFileToMatch(`${getClientDist()}index.html`,
                                                     'if (\'serviceWorker\' in navigator) {')))
    .then(() => expectToFail(() => expectFileToExist(`${getClientDist()}worker.js`)))

    // Asynchronous bundle
    .then(() => expectToFail(() => expectFileToMatch(`${getClientDist()}index.html`,
                                                   '<script src="/app-concat.js" async></script>')))
    .then(() => expectToFail(() => expectFileToExist(`${getClientDist()}app-concat.js`)));
}
