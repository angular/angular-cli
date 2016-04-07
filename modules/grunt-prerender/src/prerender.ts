import {Bootloader, BootloaderConfig} from 'angular2-universal';

export interface GulpUniversalConfig {
  server?: boolean;
  client?: boolean;
  selector?: string;
  serializedCmp?: string;
  bootloader?: any;
}

export type GulpUniversalOptions = BootloaderConfig & GulpUniversalConfig;


export class Prerender {
  constructor(private options: GulpUniversalOptions) {}

  render(file) {
      let clientHtml: string = file.toString();

      // bootstrap and render component to string
      const _options = this.options;
      const _template = clientHtml;
      const _Bootloader = Bootloader;
      let bootloader = _options.bootloader;
      if (_options.bootloader) {
        bootloader = _Bootloader.create(_options.bootloader);
      } else {
        let doc = _Bootloader.parseDocument(_template);
        _options.document = doc;
        _options.template = _options.template || _template;
        bootloader = _Bootloader.create(_options);
      }

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
        directives: {},
        providers: []
      });

      let prerender = new Prerender(options);

      function render(f) {
        let src = f.src.filter((filepath) => {
            if (!grunt.file.exists(filepath)) {
              grunt.log.warn('Source file "' + filepath + '" not found.');
              return false;
            }
            return true;
          })
          .map((filepath) => grunt.file.read(filepath))
          .join(grunt.util.normalizelf(options.separator));

        // Handle options.
        prerender
          .render(src)
          .then(buffer => src = buffer)
          .then(_src => grunt.file.write(f.dest, _src))
          .then(_ => grunt.log.writeln('File "' + f.dest + '" created.'));
      }

      this.files.forEach(render);
    });

  }

};
