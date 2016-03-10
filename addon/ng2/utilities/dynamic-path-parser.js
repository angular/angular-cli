var path = require('path');
var process = require('process');

module.exports = function dynamicPathParser(cwd, projectRoot, entityName) {
  var rootPath = path.join(projectRoot, 'src', 'app');

  var outputPath = path.join(rootPath, entityName);

  if (entityName.indexOf(path.sep) === 0) {
    outputPath = path.join(rootPath, entityName.substr(1));
  } else if (cwd.indexOf(rootPath) >= 0) {
    outputPath = path.join(cwd, entityName);
  } else if (cwd.indexOf(path.join(projectRoot, 'src')) >= 0
    && entityName.indexOf('app') === 0) {
    outputPath = path.join(cwd, entityName);
  } else if (cwd.indexOf(path.join(projectRoot, 'src')) >= 0) {
    outputPath = path.join(cwd, 'app', entityName);
  }

  if (outputPath.indexOf(rootPath) < 0) {
    throw `Invalid path: "${entityName}" cannot be ` +
      `above the "${path.join('src', 'app')}" directory`;
  }

  var adjustedPath = outputPath.replace(rootPath, '');

  var parsedPath = path.parse(adjustedPath);
  
  return parsedPath;
} 