import { ngbench } from '../../utils/process';


export default function () {
  return ngbench(
    '--match-edit-file', 'src/app/app.component.html',
    '--match-edit-string', '<div></div>'
  );
}
