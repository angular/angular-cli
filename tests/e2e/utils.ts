import {spawn} from 'child_process';
import {blue, white, yellow} from 'chalk';
import * as fs from 'fs';


export function readFile(fileName: string) {
  return new Promise((resolve, reject) => {
    fs.readFile(fileName, 'utf-8', (err: any, data: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}


export function existsOrFail(fileName: string) {
  return new Promise((resolve, reject) => {
    fs.exists(fileName, (exist) => {
      if (exist) {
        resolve();
      } else {
        reject(new Error(`File ${fileName} was expected to exist but not found...`))
      }
    })
  })
}


export function fileMatchesOrFail(fileName: string, regEx: RegExp | string) {
  return readFile(fileName)
    .then(content => {
      if (typeof regEx == 'string') {
        if (content.indexOf(regEx) == -1) {
          throw new Error(`File "${fileName}" did not contain "${regEx}"...`);
        }
      } else {
        if (!content.match(regEx)) {
          throw new Error(`File "${fileName}" did not match regex ${regEx}...`);
        }
      }
    })
}


export function expectGitToBeClean() {
  return git('status', '--porcelain')
    .then(output => {
      if (output != '') {
        throw new Error('Git repo is not clean...');
      }
    });
}


export function expectToFail(fn: () => Promise<any>): Promise<void> {
  return fn()
    .then(() => {
      throw new Error(`Function ${fn.source} was expected to fail, but succeeded.`);
    }, () => {})
}


export function isMobileTest() {
  return !!process.env['MOBILE_TEST'];
}


interface ExecOptions {
  silent?: boolean;
}

function _exec(options: ExecOptions, cmd: string, args: string[]): Promise<string> {
  let stdout = '';
  const cwd = process.cwd();
  console.log(white(
    `  ==========================================================================================`
  ));

  args = args.filter(x => x !== undefined);
  console.log(blue(`  Running \`${cmd} ${args.map(x => `"${x}"`).join(' ')}\`...`));
  console.log(blue(`  CWD: ${cwd}`));

  const npmProcess = spawn(cmd, args, {cwd, detached: true});
  npmProcess.stdout.on('data', (data: Buffer) => {
    stdout += data.toString('utf-8');
    if (options.silent) {
      return;
    }
    data.toString('utf-8')
      .split(/[\n\r]+/)
      .filter(line => line !== '')
      .forEach(line => console.log('  ' + line));
  });
  npmProcess.stderr.on('data', (data: Buffer) => {
    if (options.silent) {
      return;
    }
    data.toString('utf-8')
      .split(/[\n\r]+/)
      .filter(line => line !== '')
      .forEach(line => console.error(yellow('  ' + line)));
  });

  // Create the error here so the stack shows who called this function.
  const err = new Error(`Running "${cmd} ${args.join(' ')}" returned error code `);
  return new Promise((resolve, reject) => {
    npmProcess.on('close', (code: number) => {
      if (code == 0) {
        resolve(stdout);
      } else {
        err.message += `${code}...`;
        reject(err);
      }
    });
  });
}


export function execOrFail(cmd: string, ...args: string[]) {
  return _exec({}, cmd, args);
}

export function ng(...args: string[]) {
  return _exec({}, 'ng', args)
}
export function silentNg(...args: string[]) {
  return _exec({ silent: false }, 'ng', args);
}


export function npm(...args: string[]) {
  return _exec({}, 'npm', args);
}


export function git(...args: string[]) {
  return _exec({}, 'git', args);
}
