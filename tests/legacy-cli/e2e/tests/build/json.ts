import {ng} from '../../utils/process';	
import {expectFileToExist} from '../../utils/fs';	
import {expectGitToBeClean} from '../../utils/git';	
import {getGlobalVariable} from '../../utils/env';	


 export default function() {	
  // TODO(architect): Delete this test. It is now in devkit/build-angular.	

   return ng('build', '--stats-json')	
    .then(() => expectFileToExist('./dist/test-project/stats-es5.json'))
    .then(() => expectFileToExist('./dist/test-project/stats-es2015.json'))
    .then(() => expectGitToBeClean());	
}