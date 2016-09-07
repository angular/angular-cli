import {ng} from '../utils/process';


export default function() {
  return ng('generate', 'module', 'lazy')
    .then(() => {
      
    });
}
