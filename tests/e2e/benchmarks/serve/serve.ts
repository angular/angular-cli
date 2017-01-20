import { ngbench } from '../../utils/process';


export default function () {
  return ngbench('--extra-args=--aot');
}
