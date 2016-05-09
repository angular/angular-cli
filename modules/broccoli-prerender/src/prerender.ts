import 'angular2-universal-polyfills';
import {Bootloader} from 'angular2-universal';

const fs = require('fs');
const path = require('path');
const BroccoliPlugin: BroccoliPluginConstructor = require('broccoli-caching-writer');

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
    var sourceHtml = fs.readFileSync(path.resolve(this.inputPaths[0], this.indexPath), 'utf-8');
    var appShellOptions = require(path.resolve(this.inputPaths[0], this.appShellPath)).options;
    var options = Object.assign(appShellOptions, {
      document: Bootloader.parseDocument(sourceHtml),
    });
    var bootloader = Bootloader.create(options);
    return bootloader.serializeApplication(null, options.providers)
      .then(html =>  fs.writeFileSync(path.resolve(this.outputPath, this.indexPath), html, 'utf-8'));
  }
}
