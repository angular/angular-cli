/* jshint node: true, esnext: true */
'use strict';

const Plugin  = require('broccoli-caching-writer');
const fs      = require('fs');
const fse     = require('fs-extra');
const path    = require('path');
const ts      = require('typescript');

module.exports = TSPlugin;

TSPlugin.prototype = Object.create(Plugin.prototype);
TSPlugin.prototype.constructor = TSPlugin;

function TSPlugin(inputNodes, options) {
  options = options || {};
  Plugin.call(this, inputNodes, {
    cacheInclude: [/(.*?).ts$/],
    cacheExclude: [/(.*?).d.ts$/],
    persistentOutput: true
  });
  this.options = options;
  this.fileRegistry = Object.create(null);
  this.inputNodes = inputNodes;
  this.tsOpts = ts.parseJsonConfigFileContent({ compilerOptions: options, files: [] }, null, null).options;
  this.tsOpts.outDir = process.cwd();
  this.tsServiceHost = new ServiceHost(this.tsOpts, [], this.fileRegistry);
  this.tsService = ts.createLanguageService(this.tsServiceHost, ts.createDocumentRegistry());
}

TSPlugin.prototype.build = function() {
  let entries = this.listEntries();
  let rootFileNames = entries.map(e => {
    return path.resolve(e.basePath, e.relativePath);
  });

  let fileTimes = entries.map(e => {
    return e.mtime;
  });

  let filesToEmit = [];
  let filesToRemove = [];

  rootFileNames.forEach((fileName, i) => {
    if (!this.fileRegistry[fileName] || this.fileRegistry[fileName].version !== fileTimes[i]) {
      this.fileRegistry[fileName] = { version: fileTimes[i] };
      filesToEmit.push(fileName);
    }
  });

  Object.keys(this.fileRegistry).forEach(fileName => {
    if (rootFileNames.indexOf(fileName) === -1) {
      filesToRemove.push(fileName);
    }
  });

  this.tsServiceHost.setRootFileNames(rootFileNames);

  filesToEmit.forEach(fileName => {
    this.emitFile(fileName, this.inputPaths[0], this.outputPath);
  });

  filesToRemove.forEach(fileName => {
    this.removeFile(fileName, this.inputPaths[0], this.outputPath);
  });
};

TSPlugin.prototype.emitFile = function(fileName, inputPath, outputPath) {
  let output = this.tsService.getEmitOutput(fileName);

  output.outputFiles.forEach(o => {
    o.name = o.name.replace(inputPath, outputPath);
    fse.outputFileSync(o.name, this.fixSourceMapSources(o.text), 'utf8');
  });
};

TSPlugin.prototype.removeFile = function(fileName, inputPath, outputPath) {
  const jsPath = fileName.replace(/\.ts$/, '.js').replace(inputPath, outputPath);
  const mapPath = fileName.replace(/\.ts$/, '.js.map').replace(inputPath, outputPath);

  if (existsSync(jsPath)) {
    fs.unlinkSync(jsPath);
  }

  if (existsSync(mapPath)) {
    fs.unlinkSync(mapPath);
  }
};

TSPlugin.prototype.fixSourceMapSources = function (content) {
  try {
    const marker = "//# sourceMappingURL=data:application/json;base64,";
    const index = content.indexOf(marker);
    if (index == -1) {
      return content;
    }
    const base = content.substring(0, index + marker.length);
    let sourceMapBit = new Buffer(content.substring(index + marker.length), 'base64').toString("utf8");
    let sourceMaps = JSON.parse(sourceMapBit);
    const source = sourceMaps.sources[0];
    sourceMaps.sources = [source.substring(source.lastIndexOf("../") + 3)];
    return "" + base + new Buffer(JSON.stringify(sourceMaps)).toString('base64');
  }
  catch (e) {
    return content;
  }
};

function ServiceHost(compilerOptions, rootFileNames, fileRegistry) {
  this.compilerOptions = compilerOptions;
  this.rootFileNames = rootFileNames;
  this.fileRegistry = fileRegistry;
  this.currentDirectory = process.cwd();
  this.defaultLibFilePath = ts.getDefaultLibFilePath(compilerOptions).replace(/\\/g, '/');
}

ServiceHost.prototype.setRootFileNames = function(rootFileNames) {
  this.rootFileNames = rootFileNames;
};

ServiceHost.prototype.getScriptFileNames = function() {
  return this.rootFileNames;
};

ServiceHost.prototype.getScriptVersion = function(fileName) {
  return this.fileRegistry[fileName] && this.fileRegistry[fileName].version.toString();
};
  
ServiceHost.prototype.getScriptSnapshot = function(tsFilePath) {
  let absoluteTsFilePath;

  if (tsFilePath === this.defaultLibFilePath || path.isAbsolute(tsFilePath)) {
    absoluteTsFilePath = tsFilePath;
  }
  else if (this.compilerOptions.moduleResolution === 2 && tsFilePath.match(/^node_modules/)) {
    absoluteTsFilePath = path.resolve(tsFilePath);
  }
  else if (tsFilePath.match(/^rxjs/)) {
    absoluteTsFilePath = path.resolve('node_modules', tsFilePath);
  }
  else {
    absoluteTsFilePath = path.join(this.treeInputPath, tsFilePath);
  }
  if (!existsSync(absoluteTsFilePath)) {
    return undefined;
  }

  return ts.ScriptSnapshot.fromString(fs.readFileSync(absoluteTsFilePath, 'utf8'));
};

ServiceHost.prototype.getCurrentDirectory = function() { 
  return process.cwd();
};

ServiceHost.prototype.getCompilationSettings = function() {
  return this.compilerOptions;
};

ServiceHost.prototype.getDefaultLibFileName = function(options) {
  return ts.getDefaultLibFilePath(options);
};

function existsSync(path) {
  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    return false;
  }
}
