/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

module.exports = function (gulp) {

  return function() {

    var path = require('path'),
        $ = require('gulp-load-plugins')();

    $.livereload.listen();

    return $.nodemon({
      verbose: true,
      script: path.resolve(__dirname + '/../../index.js'),
      ext: 'js ts html',
      ignore: ['\\.git', 'node_modules', '*.js.map', '*_spec.js', 'angular']
    }).on('restart', function(){
  		gulp.src('index.js')
  			.pipe($.livereload())
  			// .pipe($.notify('Reloading page, please wait...'));
  	});

  }

};
