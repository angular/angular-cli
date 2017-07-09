'use strict';

const fs = require('fs-extra');
const EOL = require('os').EOL;

/**
  Inserts the given content into a file. If the `contentsToInsert` string is already
  present in the current contents, the file will not be changed unless `force` option
  is passed.
  If `options.before` is specified, `contentsToInsert` will be inserted before
  the first instance of that string.  If `options.after` is specified, the
  contents will be inserted after the first instance of that string.
  If the string specified by options.before or options.after is not in the file,
  no change will be made.
  If neither `options.before` nor `options.after` are present, `contentsToInsert`
  will be inserted at the end of the file.
  Example:
  ```
  // app/router.js
  Router.map(function() {
  });
  ```
  ```
  insertIntoFile('app/router.js', '  this.route("admin");', {
    after: 'Router.map(function() {' + EOL
  });
  ```
  ```
  // app/router.js
  Router.map(function() {
    this.route("admin");
  });
  ```
  @method insertIntoFile
  @param {String} pathRelativeToProjectRoot
  @param {String} contentsToInsert
  @param {Object} providedOptions
  @return {Promise}
*/
function insertIntoFile(fullPath, contentsToInsert, providedOptions) {
  let originalContents = '';

  if (fs.existsSync(fullPath)) {
    originalContents = fs.readFileSync(fullPath, { encoding: 'utf8' });
  }

  let contentsToWrite = originalContents;

  let options = providedOptions || {};
  let alreadyPresent = originalContents.indexOf(contentsToInsert) > -1;
  let insert = !alreadyPresent;
  let insertBehavior = 'end';

  if (options.before) { insertBehavior = 'before'; }
  if (options.after) { insertBehavior = 'after'; }

  if (options.force) { insert = true; }

  if (insert) {
    if (insertBehavior === 'end') {
      contentsToWrite += contentsToInsert;
    } else {
      let contentMarker = options[insertBehavior];
      let contentMarkerIndex = contentsToWrite.indexOf(contentMarker);

      if (contentMarkerIndex !== -1) {
        let insertIndex = contentMarkerIndex;
        if (insertBehavior === 'after') { insertIndex += contentMarker.length; }

        contentsToWrite = contentsToWrite.slice(0, insertIndex) +
          contentsToInsert + EOL +
          contentsToWrite.slice(insertIndex);
      }
    }
  }

  let returnValue = {
    path: fullPath,
    originalContents,
    contents: contentsToWrite,
    inserted: false,
  };

  if (contentsToWrite !== originalContents) {
    returnValue.inserted = true;

    return fs.writeFile(fullPath, contentsToWrite)
      .then(() => returnValue);

  } else {
    return Promise.resolve(returnValue);
  }
}

module.exports = insertIntoFile;
