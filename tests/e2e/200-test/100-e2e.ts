import {ng, expectToFail} from '../utils';


export default function() {
  // This is supposed to fail...
  return expectToFail(() => ng('e2e'));
}

