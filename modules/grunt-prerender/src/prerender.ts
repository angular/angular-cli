import universal = require('angular2-universal-preview');

export interface GruntUniversalConfig {
  preboot: boolean;
  bootloader: any;
  componentProviders: any[];
  platformProviders: any[];
  directives: any[];
  providers: any[];
}


export class Prerender {
  constructor(private options: GruntUniversalConfig) {}

  render(file) {
      let clientHtml: string = file.toString();

      // bootstrap and render component to string
      var bootloader = this.options.bootloader;
      if (!this.options.bootloader) {
        this.options.bootloader = {
          document: universal.parseDocument(clientHtml),
          providers: this.options.providers,
          componentProviders: this.options.componentProviders,
          platformProviders: this.options.platformProviders,
          directives: this.options.directives,
          preboot: this.options.preboot
        };
      }
      bootloader = universal.Bootloader.create(this.options.bootloader);

      return bootloader.serializeApplication().then(html => new Buffer(html));
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

      let options = this.options({
        App: {},
        providers: [],
        preboot: true
      });

      let prerender = new Prerender(options);


      this.files.forEach((f) => {

        let src = f.src.filter((filepath) => {

          if (!grunt.file.exists(filepath)) {
            grunt.log.warn('Source file "' + filepath + '" not found.');
            return false;
          } else {
            return true;
          }
        })
          .map((filepath) => grunt.file.read(filepath))
          .join(grunt.util.normalizelf(options.separator));

        // Handle options.
        prerender
          .render(src)
          .then((buffer) => src = buffer)
          .then((_src) => grunt.file.write(f.dest, _src))
          .then(_ => grunt.log.writeln('File "' + f.dest + '" created.'));

      });
    });

  }

};
