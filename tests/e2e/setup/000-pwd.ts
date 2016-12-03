import {join} from 'path';


export default function() {
  // Setup to use the local universal-cli copy.
  process.chdir(join(__dirname, '../..'));
}
