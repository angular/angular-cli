var path = require('path');
var process = require('process');
var fs = require('fs');

module.exports = function dynamicPathParser(project, entityName) {
  var projectRoot = project.root;
  var appRoot = path.join(project.ngConfig.defaults.sourceDir, 'app');
  var cwd = process.env.PWD;

  var rootPath = path.join(projectRoot, appRoot);

  var outputPath = path.join(rootPath, entityName);
  
  if (entityName.indexOf(path.sep) === 0) {
    outputPath = path.join(rootPath, entityName.substr(1));
  } else if (cwd.indexOf(rootPath) >= 0) {
    outputPath = path.join(cwd, entityName);
  }
  
  if (!fs.existsSync(outputPath)) {
    // Verify the path exists on disk.
    var parsedOutputPath = path.parse(outputPath);
    var parts = parsedOutputPath.dir.split(path.sep).slice(1);
    var newPath = parts.reduce((tempPath, part) => {
      // if (tempPath === '') {
      //   return part;
      // }
      var withoutPlus = path.join(tempPath, path.sep, part);
      var withPlus = path.join(tempPath, path.sep, '+' + part);
      if (fs.existsSync(withoutPlus)) {
        return withoutPlus;
      } else if (fs.existsSync(withPlus)) {
        return withPlus;
      }
      
      throw `Invalid path: "${withoutPlus}"" is not a valid path.`
    }, parsedOutputPath.root);
    outputPath = path.join(newPath, parsedOutputPath.name);
  }
  
  if (outputPath.indexOf(rootPath) < 0) {
    throw `Invalid path: "${entityName}" cannot be ` +
        `above the "${appRoot}" directory`;
  }

  var adjustedPath = outputPath.replace(projectRoot, '');

  var parsedPath = path.parse(adjustedPath);
  
  if (parsedPath.dir.indexOf(path.sep) === 0) {
    parsedPath.dir = parsedPath.dir.substr(1);
  }

  parsedPath.dir = parsedPath.dir === path.sep ? '' : parsedPath.dir;
  parsedPath.appRoot = appRoot

  return parsedPath;
};