import { killAllProcesses, silentNg } from '../../../utils/process';
import { ngServe } from '../../../utils/project';

export default async function () {
  try {
    // Should run side-by-side with `ng serve`
    await ngServe();
    await silentNg('e2e');
  } finally {
    killAllProcesses();
  }
}
