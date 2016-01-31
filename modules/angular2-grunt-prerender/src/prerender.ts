import universal = require('angular2-universal-preview');

interface IUniversalConfig {
  preboot: boolean;
  App: any;
  providers: any[];
}

class Angular2Prerender {
  constructor(private options){}
  
  render(file) {
    
    let str: string = file.toString();

    let renderPromise = universal.renderToString;
    let args = [this.options.App, this.options.providers];

    if (this.options.preboot) {
      renderPromise = universal.renderToStringWithPreboot;
      args.push(this.options.preboot);
    }

    return renderPromise.apply(null, args)
      .then((serializedApp) => {
        let html = str.replace(
          // <selector></selector>
          universal.selectorRegExpFactory(universal.selectorResolver(this.options.App)),
          // <selector>{{ serializedCmp }}</selector>
          serializedApp
        );

        return new Buffer(html);
      });
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
module.exports = class GruntAngular2Prerender {

  constructor(grunt){

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    grunt.registerMultiTask('angular2-prerender', 'Prerender your Universal (isomorphic) Angular 2 app', function() {
      // don't use arrow function here. coz we need to get Grunt's "this" context!

      let options = this.options({
        App: {},
        providers: [],
        preboot: true
      });

      let angular2Prerender = new Angular2Prerender(options);


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
        angular2Prerender
          .render(src)
          .then((buffer) => src = buffer)
          .then((_src) => grunt.file.write(f.dest, _src))
          .then(_ => grunt.log.writeln('File "' + f.dest + '" created.'))

      });
    });

  }

}


