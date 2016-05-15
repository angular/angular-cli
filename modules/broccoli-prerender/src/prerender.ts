import 'angular2-universal-polyfills';
import {Bootloader} from 'angular2-universal';
import { disposePlatform } from '@angular/core';

const fs = require('fs');
const path = require('path');
const BroccoliPlugin: BroccoliPluginConstructor = require('broccoli-caching-writer');
var exec = require('child_process').exec;

export interface BroccoliPlugin {}

interface BroccoliPluginConstructor {
  new(inputNodes: any[], options?: any): BroccoliPluginConstructor;
  inputPaths: string[];
  outputPath: string;
}

export class AppShellPlugin extends BroccoliPlugin {
  constructor (inputNodes, private indexPath: string, private appShellPath: string) {
    super([inputNodes]);
  }

  build() {
    return new Promise((resolve, reject) => {
      var command =`node ${path.resolve(__dirname, 'child_proc.js')}  ${[
        `--sourceHtml=${path.resolve(this.inputPaths[0], this.indexPath)}`,
        `--optionsPath=${path.resolve(this.inputPaths[0], this.appShellPath)}`,
        `--outputIndexPath=${path.resolve(this.outputPath, this.indexPath)}`
      ].join(' ')}`;
      exec(command, {
        timeout: 5000
      }, (err, stdin) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
