var path = require('path');
var process = require('process');

module.exports = function dynamicPathParser(project, entityName) {
  var projectRoot = project.root;
  var cwd = process.env.PWD;

  var rootPath = path.join(projectRoot, 'src', 'client', 'app');

  var outputPath = path.join(rootPath, entityName);

  if (entityName.indexOf(path.sep) === 0) {
    outputPath = path.join(rootPath, entityName.substr(1));
  } else if (cwd.indexOf(rootPath) >= 0) {
    outputPath = path.join(cwd, entityName);
  } else if (cwd.indexOf(path.join(projectRoot, 'src', 'client')) >= 0) {
    if (entityName.indexOf('app') === 0) {
      outputPath = path.join(cwd, entityName);
    } else {
      outputPath = path.join(cwd, 'app', entityName);
    }
  } else if (cwd.indexOf(path.join(projectRoot, 'src')) >= 0) {
    if (entityName.indexOf(path.join('client', 'app')) === 0) {
      outputPath = path.join(cwd, entityName);
    } else if (entityName.indexOf('client') === 0) {
      outputPath = path.join(cwd, 'app', entityName);
    } else {
      outputPath = path.join(cwd, 'client', 'app', entityName);
    }
  }
  
  if (outputPath.indexOf(rootPath) < 0) {
    throw `Invalid path: "${entityName}" cannot be ` +
        `above the "${path.join('src', 'app')}" directory`;
  }

  var adjustedPath = outputPath.replace(rootPath, '');

  var parsedPath = path.parse(adjustedPath);

  parsedPath.dir = parsedPath.dir === path.sep ? '' : parsedPath.dir;

  return parsedPath;
};