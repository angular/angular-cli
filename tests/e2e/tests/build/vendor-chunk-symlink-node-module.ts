import {ng} from '../../utils/process';
import {deleteFile, expectFileToExist, moveFile, symlinkFile} from '../../utils/fs';


// THIS TEST REQUIRES TO MOVE NODE_MODULES AND MOVE IT BACK.
export default function() {
  return Promise.resolve()
    .then(() => moveFile('node_modules', '../node_modules'))
    .then(() => symlinkFile('../node_modules', 'node_modules', 'dir'))
    .then(() => ng('build'))
    .then(() => expectFileToExist('dist/vendor.bundle.js'))
    // Cleanup
    .then(() => {
      return deleteFile('node_modules')
        .then(() => moveFile('../node_modules', 'node_modules'));
    }, (err: any) => {
      return deleteFile('node_modules')
        .then(() => moveFile('../node_modules', 'node_modules'))
        .then(() => { throw err; });
    })
}
