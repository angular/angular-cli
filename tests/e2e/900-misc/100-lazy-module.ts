import {ng} from '../utils';


export default function() {
  return ng('generate', 'module', 'lazy')
    .then(() => {

    });
}
