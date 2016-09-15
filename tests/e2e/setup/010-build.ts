import {npm} from '../utils/process';


export default function() {
  return npm('run', 'build');
}
