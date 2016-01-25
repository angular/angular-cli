/// <reference path="./tsd_typings/node/node.d.ts"/>
var path = require('path');
var http = require('http');
var fs = require('fs');
var child_process = require('child_process');

// Gulp and Plugins
var gulp = require('gulp');
var $ = require('gulp-load-plugins')({
  pattern: [
    'gulp-*',
    'gulp.*',
    'browserify',
    'vinyl-source-stream',
    'del',
    'run-sequence',
    'conventional-changelog',
    'jasmine-*',
    'karma',
    'serve-*',
    'opn',
    'browser-sync'
  ]
});


// Configuration

var LIVERELOAD_PORT = 35729;
var PORT = 3000;
var SERVER_IP = 'localhost';
var TS_PROJECT = $.typescript.createProject(root('/tsconfig.json'));

var PATHS = {

  config: {
    karma: root('/karma.conf.js'),
    protractor: root('/protractor.conf.js')
  },

  cleanable: rootDir([
    './dist/',
    './tsd_typings/',
    './node_modules/',
    './modules/**/node_modules',
    './modules/**/dist'
  ]),

  files: {
    ts: rootDir([
      './modules/**/*.ts',
      './examples/**/*.ts'
    ])
  },

  preboot: {
    server: root('/dist/modules/preboot/server'),
    exampleDest: root('/dist/preboot'),
    karmaEntryPoint: root('/dist/modules/preboot/test/preboot_karma'),
    karmaDest: root('/dist/karma'),
    karmaCode: root('/dist/karma/preboot_karma.js'),
    clientRoot: root('/dist/modules/preboot/src/client')
  },

  changelog: {
    filename: root('CHANGELOG.md')
  },

  serverIndex : root('/index.js'),

  specs: rootDir([
    'dist/**/*_spec.js'
  ]),

  e2e: rootDir([
    'test/**/*.e2e.js'
  ]),


};

var CONFIG = {

  browserSync: {
    online: false,
    logLevel: 'debug',
    logPrefix: 'Universal',
    server: {
      baseDir: rootDir([
        './examples'
      ]),
      index: root('./examples'),
      directory: true,
      ghostMode: false
    },
    files: rootDir([
      './examples/**/*.js'
    ]),
    watchOptions: {
      ignored: rootDir([
        '*.js.map',
        '*_spec.js'
      ])
    },
    port: 3000,
    host: SERVER_IP
  },

  nodemon: {
    verbose: true,
    script: PATHS.serverIndex,
    ext: 'js ts html',
    ignore: rootDir([
      './\\.git',
      './node_modules/**/node_modules',
      './*.js.map',
      './*_spec.js',
      './angular',
      './.DS_Store',
      './tsd_typings',
      './web_modules',
      './.idea'
    ]),
    watch: rootDir([
      './dist/',
      // './modules/',
      './index.js'
    ])
  },


  preboot: {
    appRoot:  'app',         // selector for root element
    freeze:   'spinner',     // show spinner w button click & freeze page
    replay:   'rerender',    // rerender replay strategy
    buffer:   true,          // client app will write to hidden div until bootstrap complete
    debug:    true,
    uglify:   false,
    presets:  [ 'keyPress', 'buttonPress', 'focus' ]
  },

  karma: {
    port: 9201,
    runnerPort: 9301,
    captureTimeout: 20000,
    growl: true,
    colors: true,
    browsers: [
      'PhantomJS'
    ],
    reporters: [
      'progress'
    ],
    plugins: [
      'karma-jasmine',
      'karma-phantomjs-launcher',
      'karma-chrome-launcher'
    ],
    frameworks: [ 'jasmine' ],
    singleRun: true,
    autoWatch: false,
    files: [ PATHS.preboot.karmaCode ]
  }

}

// Tasks definitions

gulp.task('default', function(done) {

  var tasks = [
    'lint',
    'karma'
  ];

  return $.runSequence(tasks, done);

});

gulp.task('ci', function(done) {

  var tasks = [
    'lint',
    'test'
    // 'protractor'
  ];

  return $.runSequence(tasks, done);

});

// Preboot

// build version of preboot to be used in a simple example
gulp.task('preboot.example', [ 'build.typescript' ], function() {
  var exec = require('child_process').exec;
  var preboot = require(PATHS.preboot.server);

  // TODO: refactor these exec out
  exec('mkdir -p ./dist');
  exec('mkdir -p ./dist/preboot');
  // copy static files to dist
  exec('cp -fR examples/preboot/. ' + PATHS.preboot.exampleDest);

  return preboot.getClientCodeStream(CONFIG.preboot).
    pipe($.size()).
    pipe(gulp.dest(PATHS.preboot.exampleDest));

});

// build version of preboot to be used for karma testing
gulp.task('preboot.karma', [ 'build.typescript' ], function() {

  var b = $.browserify({
    entries: [ PATHS.preboot.karmaEntryPoint ],
    basedir: PATHS.preboot.clientRoot,
    browserField: false
  });

  return b.bundle().
    pipe($.vinylSourceStream('preboot_karma.js')).
    pipe(gulp.dest(PATHS.preboot.karmaDest));

});


// Build

gulp.task('build.typescript', [ 'build.typescript.project' ]);

gulp.task('build.typescript.project', function() {

  return TS_PROJECT.src().
    pipe($.typescript(TS_PROJECT)).
    pipe($.size()).
    pipe(gulp.dest(TS_PROJECT.config.compilerOptions.outDir));

});

gulp.task('build.typescript.all', function() {

  return gulp.src(PATHS.files.ts).
    pipe($.typescript(TS_PROJECT)).
    pipe($.size()).
    pipe(gulp.dest(TS_PROJECT.config.compilerOptions.outDir));

});


gulp.task('build', [
  'build.typescript.all',
  'preboot.example',
  'preboot.karma'
]);

// Changelog

gulp.task('changelog', function() {

  return $.conventionalChangelog({
    preset: 'angular'
  }).
  pipe(fs.createWriteStream(PATHS.changelog.filename));

});

// Clean

gulp.task('clean', function() {

  return $.del(PATHS.cleanable, function (err, paths) {
    if (paths.length <= 0) {
      return console.log('Nothing to clean.');
    }
    return console.log('Deleted folders:\n', paths.join('\n'));
  });

});

// Debug

gulp.task('debug', function() {

  return gulp.src(PATHS.serverIndex).pipe($.nodeInspector());

});

// Testing

gulp.task('test', [
  'jasmine',
  'karma'
]);

gulp.task('jasmine', [ 'build.typescript' ], function() {

  var terminalReporter = new $.jasmineReporters.TerminalReporter({
    verbose: 3,
    showStack: true,
    color: true
  });

  var SpecReporter = require('jasmine-spec-reporter');
  var specReporter = new SpecReporter();

  return gulp.src(PATHS.specs).
    pipe($.jasmine({
      verbose: true,
      includeStackTrace: true,
      reporter: specReporter
    }));

});

gulp.task('karma', [ 'karma.preboot']);

gulp.task('karma.preboot', [ 'preboot.karma'], function(done){

  var karma = new $.karma.Server(CONFIG.karma, done);

  return karma.start();

});

gulp.task('protractor', function() {

  return gulp.src(PATHS.e2e).
    pipe($.protractor.protractor({
      configFile: PATHS.config.protractor
    })).
    on('error', function(e) { throw e })
});

gulp.task('protractor.start', function(done){

  return $.protractor.webdriver_standalone(done);

});

gulp.task('protractor.update', function(done){

  child_process.
    spawn(getProtractorBinary('webdriver-manager'), ['update'], {
      stdio: 'inherit'
    }).
    once('close', done);

});

gulp.task('lint', function() {

  return gulp.src(PATHS.files.ts).
    pipe($.tslint()).
    pipe($.tslint.report('verbose'));

});

//  Watch

gulp.task('watch', function(){

  gulp.watch(PATHS.files.ts, ['build.typescript.all']);
  gulp.watch(PATHS.specs, ['jasmine']);

});

gulp.task('!browser-sync', function() {

  $.browserSync.init(CONFIG.browserSync);

});

// Serve

// "serve" defaults to nodemon for the moment.
gulp.task('serve', [ 'serve.nodemon']);
gulp.task('server', [ 'nodemon']);

gulp.task('nodemon', function() {

  $.livereload.listen();

  return $.nodemon(CONFIG.nodemon).
  on('restart', function() {
    gulp.src('index.js').pipe($.livereload());
  });
});

gulp.task('serve.nodemon', [ 'watch' ], function() {

  $.livereload.listen();

  $.opn('http://' + SERVER_IP + ':' + PORT + '/');

  return $.nodemon(CONFIG.nodemon).
  on('restart', function() {
    gulp.src('index.js').pipe($.livereload());
      // .pipe($.notify('Reloading page, please wait...'));
  });
});

gulp.task('serve.preboot', function() {
// todo: refactor to better fit in with rest of gulp script

  var express = require('express');
  var livereload = require('connect-livereload');
  var reloader = require('gulp-livereload');
  var serveStatic = require('serve-static');
  var exec = require('child_process').exec;
  var open = require('open');
  var server = express();
  var LIVERELOAD_PORT = 35729;
  var PORT = 3000;

  server.use(livereload({
    port: LIVERELOAD_PORT
  }));

  server.use(serveStatic('dist'));
  server.use(serveStatic('examples'));

  server.listen(PORT);
  reloader.listen({
    port: LIVERELOAD_PORT,
    reloadPage: '/preboot/preboot_example.html'
  });
  open('http://localhost:3000/preboot/preboot_example.html');

  exec('tsc -w');
  gulp.watch('modules/preboot/**/*', [ 'build']);
  gulp.watch('dist/preboot/preboot.js', function () {
    reloader.reload();
  });

});






// Utilities

function getProtractorBinary(binaryName){
  var winExt = /^win/.test(process.platform)? '.cmd' : '';
  var pkgPath = require.resolve('protractor');
  var protractorDir = path.resolve(path.join(path.dirname(pkgPath), '..', '..', '.bin'));
  return path.join(protractorDir, '/'+binaryName+winExt);
}

// convert path to absolute from root directory
function root(_path) {
  return path.join(__dirname, _path);
}

// convert array paths to absolute from root directory
function rootDir(dir) {
  return dir.map(root);
}

// pass through value to log
function log(value) {
  console.log(value);
  return value;
}
