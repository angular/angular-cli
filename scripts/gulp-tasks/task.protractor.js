/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

module.exports = function (gulp) {
  
  return function () {

  	var protractor = require("gulp-protractor").protractor;
  	var path = require('path');

		return gulp.src(['dist/**/*_spec.js'])
	    .pipe(protractor({
	      configFile: path.resolve(__dirname + '/../../protractor.conf.js')
	    }))
    	.on('error', function(e) { throw e })
  
  };
  
};
