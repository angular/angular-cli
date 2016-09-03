import {spawn} from 'child_process';
import {blue, white, yellow} from 'chalk';


const temp = require('temp');


export function isMobileTest() {
  return !!process.env['MOBILE_TEST'];
}


export function execOrFail(cmd: string, ...args: string[]): Promise<string> {
  let stdout = '';
  const cwd = process.cwd();
  console.log(white(
    `  ==========================================================================================`
  ));
  console.log(blue(`  Running "${cmd} ${args.join(' ')}"...`));
  console.log(blue(`  CWD: ${cwd}`));

  const npmProcess = spawn(cmd, args, {cwd, detached: true});
  npmProcess.stdout.on('data', (data: Buffer) => {
    data.toString('utf-8')
      .split(/[\n\r]+/)
      .forEach(line => console.log(white('  ' + line)));
  });
  npmProcess.stderr.on('data', (data: Buffer) => {
    data.toString('utf-8')
      .split(/[\n\r]+/)
      .forEach(line => console.error(yellow('  ' + line)));
  });

  return new Promise((resolve, reject) => {
    npmProcess.on('close', (code: number) => {
      if (code == 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Running "${cmd} ${args.join(' ')}" returned error code ${code}.`));
      }
    });
  });
}


export function ng(...args: string[]) {
  return execOrFail('ng', ...args)
}


export function npm(...args: string[]) {
  return execOrFail('npm', ...args);
}
