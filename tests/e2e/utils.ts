import {spawn} from 'child_process';
import * as chalk from 'chalk';
import {oneLine, stripIndents} from 'common-tags';

const temp = require('temp');
const express = require('express');
const http = require('http');
const request = require('request');


export function isMobileTest() {
  return !!process.env['MOBILE_TEST'];
}


export function execOrFail(cmd: string, ...args: string[]): Promise<string> {
  let stdout = '';
  const cwd = process.cwd();
  console.log(chalk.yellow(stripIndents`
    Running "${cmd} ${args.join(' ')}"...
    CWD: ${cwd}
  `));

  const npmProcess = spawn(cmd, args, {cwd, detached: true});
  npmProcess.stdout.on('data', (data: Buffer) => {
    const str = data.toString('utf-8');
    stdout += str;
    process.stdout.write(chalk.reset('   ' + str.split(/\n/g).join('\n   ').replace(/ +$/, '')));
  });
  npmProcess.stderr.on('data', (data: Buffer) => {
    process.stderr.write(chalk.red('   ' + data.toString().split(/\n/g).join('\n   ')));
  });

  return new Promise((resolve, reject) => {
    npmProcess.on('close', (code: number) => {
      if (code == 0) {
        resolve(stdout);
      } else {
        reject(new Error(oneLine`
          Running "${cmd} ${args.join(' ')}" returned error code ${code}.
        `));
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

