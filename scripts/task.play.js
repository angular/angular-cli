/**
 * Run webserver to try out examples
 */
var express = require('express');
var livereload = require('connect-livereload');
var reloader = require('gulp-livereload');
var serveStatic = require('serve-index');
var serveIndex = require('serve-static');
var exec = require('child_process').exec;
var open = require('open');
var server = express();
var livereloadport = 35729;
var serverport = 3000;

server.use(livereload({
  port: livereloadport
}));

server.use('/', serveStatic('examples'));
server.use('/', serveIndex('examples'));

module.exports = function (gulp) {

  function start(location) {
    server.listen(serverport);
    reloader.listen({
      port: livereloadport,
      reloadPage: location
    });
    open('http://localhost:3000' + location);
    
    exec('tsc -w');
    gulp.watch('dist/**/*', ['build']);
    gulp.watch('examples/**/*', function () {
      reloader.reload();
    });
  }
  
  return {
    'preboot': function () { 
      start('/preboot_basic/preboot.html'); 
    },
    '': function () { 
      start('/'); 
    } 
  };
};