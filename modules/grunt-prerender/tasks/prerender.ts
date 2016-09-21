

export class Prerender {
  constructor(_options) {}

  render(_file) {
      return Promise.resolve('');
  }
}


/*
 * angular2-grunt-prerender
 * https://github.com/angular/universal
 *
 * Copyright (c) 2016 Wassim Chegham
 * Licensed under the MIT license.
 */

// needs to be written like this otherwise Grunt will fail to load this task
module.exports = class GruntPrerender {

  constructor(grunt) {

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('angular2-prerender', 'Prerender your Universal (isomorphic) Angular 2 app', function() {
      // don't use arrow function here. coz we need to get Grunt's "this" context!

    });

  }

};
