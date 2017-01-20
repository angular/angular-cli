import { ngbench } from '../utils/process';


export default function () {
  return ngbench('--command', 'ng build');
}
