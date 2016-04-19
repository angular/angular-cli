var path = require('path');
var EOL = require('os').EOL;

module.exports = addBarrelRegistration;

function addBarrelRegistration(blueprint, installationDir, fileName) {
  var parts = installationDir.split(path.sep);
  
  var idx = parts.lastIndexOf('shared');
  if (idx < parts.length -2) {
    return Promise.resolve();
  }
  
  var sharedDir = parts.slice(0, idx + 1).join(path.sep);
  var relativeParts = parts.splice(idx + 1);
  if (fileName) {
    relativeParts.push(fileName);
  }
  var importFrom = './' + relativeParts.join('/');
  
  return blueprint.insertIntoFile(
    sharedDir + path.sep + 'index.ts',
    `export * from '${importFrom}';${EOL}`
  );
}
