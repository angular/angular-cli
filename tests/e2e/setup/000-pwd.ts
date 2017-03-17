import {join} from 'path';


export default function() {
  // Setup to use the local @angular/cli copy.
  process.chdir(join(__dirname, '../../..'));
}
