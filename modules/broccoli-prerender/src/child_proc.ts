
import 'angular2-universal-polyfills';
import { parseDocument, serializeDocument, NodePlatform } from '@angular/universal';
import { disposePlatform } from '@angular/core';
const fs = require('fs');
const path = require('path');
const args = require('optimist').argv;
const appShellOptions = require(args.optionsPath).options;
const sourceHtml = fs.readFileSync(args.sourceHtml, 'utf-8');

var options = Object.assign(appShellOptions, {
  document: parseDocument(sourceHtml),
});

var NodePlatform_ = new NodePlatform(options);

// Make sure to get all providers and platformProviders
var providers = [].concat(options.providers || []).concat(options.platformProviders || []);
NodePlatform_.serializeModule(null, providers)
  .then(html =>  fs.writeFileSync(args.outputIndexPath, html, 'utf-8'))
  .then(() => process.exit(0))
  .catch(e => {
    if (e) { 
      console.error(e);
    }
    process.exit(1);
  });
