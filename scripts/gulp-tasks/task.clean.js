/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

module.exports = function (gulp) {
  
  return function() {
    
    var del = require('del');

    var folders = [
      './dist/',
      './tsd_typings/',
      './node_modules/angular2/',
      './angular/modules/angular2/typings/',
      './angular/dist/',
      './web_modules/'
    ];

    return del(folders, function (err, paths) {
      if(paths.length <= 0){
        console.log('Nothing to clean.')
      }
      else {
        console.log('Deleted folders:\n', paths.join('\n'));
      }
    });
    
  }
  
};
