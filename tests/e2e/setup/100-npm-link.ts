import {npm, exec} from '../utils/process';


export default function (argv: any) {
  return Promise.resolve()
    .then(() => argv.nolink || npm('link'))
    .then(() => exec(process.platform.startsWith('win') ? 'where' : 'which', 'ng'));
}
