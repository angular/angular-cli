
import 'angular2-universal-polyfills';
import {Bootloader} from 'angular2-universal';
import { disposePlatform } from '@angular/core';
const fs = require('fs');
const path = require('path');
const args = require('optimist').argv;
const appShellOptions = require(args.optionsPath).options;
const sourceHtml = fs.readFileSync(args.sourceHtml, 'utf-8');

var options = Object.assign(appShellOptions, {
  document: Bootloader.parseDocument(sourceHtml),
});
var bootloader = Bootloader.create(options);
// Make sure to get all providers and platformProviders
var providers = [].concat(options.providers || []).concat(options.platformProviders || []);
bootloader.serializeApplication(null, providers)
  .then(html =>  fs.writeFileSync(args.outputIndexPath, html, 'utf-8'))
  .then(() => process.exit(0))
  .catch(e => {
    if (e) console.error(e);
    process.exit(1);
  });
