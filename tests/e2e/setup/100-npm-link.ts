import {join} from 'path';
import {npm, exec} from '../utils/process';


export default function (argv: any) {
  return Promise.resolve()
    .then(() => {
      if (argv.nolink) {
        return;
      }

      const distAngularCli = join(__dirname, '../../../dist/angular-cli');
      const oldCwd = process.cwd();
      process.chdir(distAngularCli);
      return npm('link')
        .then(() => process.chdir(oldCwd));
    })
    .then(() => exec(process.platform.startsWith('win') ? 'where' : 'which', 'ng'));
}
