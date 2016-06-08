var path = require('path');
var fs = require('fs');
var EOL = require('os').EOL;

module.exports = addBarrelRegistration;

function sortBarrel(contents) {
  var parts = contents.split(EOL).filter(function(l){
    return l.trim().length > 0;
  });
  parts.sort();
  return parts.join(EOL) + EOL;
}

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
  ).then(function(r){
    var contents = fs.readFileSync(r.path, 'utf8');

    contents = sortBarrel(contents);

    fs.writeFileSync(r.path, contents, 'utf8');

    r.contents = contents;
    return r;
  });
}
