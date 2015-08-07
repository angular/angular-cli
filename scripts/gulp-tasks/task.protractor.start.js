/// <reference path="../../typings/node/node.d.ts"/>
'use strict';

module.exports = function (gulp) {
  
  return function (done) {

  	return require("gulp-protractor").webdriver_standalone(done);
  
  };
  
};
