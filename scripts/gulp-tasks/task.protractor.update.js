/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

module.exports = function (gulp) {
  
  return function (done) {

  	var path = require('path');
		var child_process = require('child_process');

		function getProtractorBinary(binaryName){
	    var winExt = /^win/.test(process.platform)? '.cmd' : '';
	    var pkgPath = require.resolve('protractor');
	    var protractorDir = path.resolve(path.join(path.dirname(pkgPath), '..', 'bin'));
	    return path.join(protractorDir, '/'+binaryName+winExt);
		}

		child_process.spawn(getProtractorBinary('webdriver-manager'), ['update'], {
      stdio: 'inherit'
    }).once('close', done);
  
  };
  
};
