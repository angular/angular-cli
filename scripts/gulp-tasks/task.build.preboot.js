/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

module.exports = function (gulp, opts) {
  
  return function () {
    
    var preboot = require(opts.paths.preboot.server);
            
    return preboot.getClientCodeStream({
      appRoot:  'app',         // selector for root element
      freeze:   'spinner',     // show spinner w button click & freeze page
      replay:   'rerender',    // rerender replay strategy
      buffer:   true,          // client app will write to hidden div until bootstrap complete
      debug:    true,
      uglify:   false,
      presets:  ['keyPress', 'buttonPress', 'focus']
    })
    .pipe(gulp.dest(opts.paths.preboot.dest));

  };
}
