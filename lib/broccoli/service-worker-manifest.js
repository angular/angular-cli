/* jshint node: true, esnext: true */
'use strict';

const Plugin  = require('broccoli-caching-writer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

const MANIFEST_FILE     = 'manifest.appcache';
const FILE_HASH_PREFIX  = '# sw.file.hash:';

module.exports = SWManifestPlugin;

SWManifestPlugin.prototype = Object.create(Plugin.prototype);
SWManifestPlugin.prototype.constructor = SWManifestPlugin;

function SWManifestPlugin(inputNodes, options) {
  options = options || {};
  Plugin.call(this, inputNodes, {
    cacheExclude: [/manifest.appcache$/]
  });
  this.options = options;
  this.fileRegistry = [];
  this.firstBuild = true;
}

SWManifestPlugin.prototype.build = function() {
  this.inputPath = this.inputPaths[0];
  this.cwd = process.cwd();

  let entries = this.listEntries();
  let fileNames = entries.map(e => {
    return path.resolve(e.basePath, e.relativePath);
  });
  
  let manifest = {};

  let files = [];
  let filesToRemove = [];

  fileNames.forEach((fileName, i) => {
    files.push(fileName);
  });

  this.fileRegistry.forEach(fileName => {
    if (fileNames.indexOf(fileName) === -1) {
      filesToRemove.push(fileName);
    }
  });

  this.fileRegistry = fileNames;

  filesToRemove.forEach((file) => delete manifest[file]);

  [].concat(files)
    .filter((file) => file !== MANIFEST_FILE)
    .forEach((file) => manifest[file] = this.computeFileHash(file));
  
  let manifestPath = path.join(this.outputPath, MANIFEST_FILE);
  fs.writeFileSync(manifestPath, this.generateManifest(manifest), 'utf8');
};

SWManifestPlugin.prototype.computeFileHash = function(file) {
  let contents = fs.readFileSync(file);

  return crypto.createHash('sha1').update(contents).digest('hex');
};

SWManifestPlugin.prototype.computeBundleHash = function(files, manifest) {
  let hash = crypto.createHash('sha1');
  files.forEach((file) => hash.update(manifest[file] + ':' + file));

  return hash.digest('hex');
};

SWManifestPlugin.prototype.generateManifest = function(manifest) {
  let files = Object.keys(manifest).sort();
  let bundleHash = this.computeBundleHash(files, manifest);
  let contents = files
    .map((file) => `# sw.file.hash: ${this.computeFileHash(file)}\n${file.replace(this.inputPath, this.cwd)}`)
    .join('\n');
  
  return `CACHE MANIFEST
# sw.bundle: ng-cli
# sw.version: ${bundleHash}
${contents}
`;
};
