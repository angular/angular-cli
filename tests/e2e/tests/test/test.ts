import {ng} from '../../utils/process';


export default function() {
  return ng('test', '--watch=false');
}
