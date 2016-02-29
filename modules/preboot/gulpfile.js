var gulp = require('gulp');
var path = require('path');
var fs = require('fs');
var rootDir = __dirname;

// config values passed into every gulp task file
var buildConfig = {
  rootDir: rootDir,
  tsFiles: ['src/**/*.ts', 'test/**/*.ts'],
  testFiles: 'dist/test/**/*_spec.js',
  distDir: path.join(rootDir, 'dist'),
  prebootBrowser: path.join(rootDir, 'dist/src/browser/preboot_browser'),
  prebootNode: path.join(rootDir, 'dist/src/node/preboot_node')
};

// dynamically load in all the build task files
var buildtasksDir = path.join(buildConfig.rootDir, 'buildtasks');
var buildtaskFiles = fs.readdirSync(buildtasksDir) || [];
buildtaskFiles.forEach(function (buildtaskFile) {
  var buildtaskPath = path.join(buildtasksDir, buildtaskFile);
  var buildtask = require(buildtaskPath);
  buildtask(buildConfig);
});
