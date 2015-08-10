/// <reference path="./tsd_typings/node/node.d.ts"/>

var gulp = require('gulp');
var path = require('path');
var http = require('http');
var source = require('vinyl-source-stream');
var browserify = require('browserify');
var fs = require('fs');
var child_process = require('child_process');

var $ = require('gulp-load-plugins')({
  pattern: [
    'gulp-*',
    'gulp.*',
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

// Utilities

function getProtractorBinary(binaryName){
  var winExt = /^win/.test(process.platform)? '.cmd' : '';
  var pkgPath = require.resolve('protractor');
  var protractorDir = path.resolve(path.join(path.dirname(pkgPath), '..', 'bin'));
  return path.join(protractorDir, '/'+binaryName+winExt);
}

function root(_path) {
  return path.join(__dirname, _path);
}

function rootDir(dir) {
  return dir.map(root);
}

// configuration

var livereloadport = 35729;
var serverport = 3000;
var serverip = 'localhost';
var tsProject = $.typescript.createProject(root('/tsconfig.json'));

var paths = {

  config: {
    karma: root('/karma.conf.js'),
    protractor: root('/protractor.conf.js')
  },

  cleanable: rootDir([
    './dist/',
    './tsd_typings/',
    './node_modules/angular2/',
    './angular/modules/angular2/typings/',
    './angular/dist/',
    './web_modules/'
  ]),

  files: {
    ts: [
      './modules/**/*.ts',
      './examples/**/*.ts'
    ]
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

  specs: [
    'dist/**/*_spec.js'
  ]

};

// Tasks definitions

gulp.task('default', function(done){

  var tasks = [
    'lint',
    'karma'
  ];

  return $.runSequence(tasks, done);

});

gulp.task('ci', function(done){

  var tasks = [
    'lint',
    'karma',
    // 'protractor'
  ];

  return $.runSequence(tasks, done);

});

gulp.task('build', [
  'preboot.example',
  'preboot.karma',
  'build.typescript'
]);

// build version of preboot to be used in a simple example
gulp.task('preboot.example', function() {

  var preboot = require(paths.preboot.server);

  return preboot.getClientCodeStream({
    appRoot:  'app',         // selector for root element
    freeze:   'spinner',     // show spinner w button click & freeze page
    replay:   'rerender',    // rerender replay strategy
    buffer:   true,          // client app will write to hidden div until bootstrap complete
    debug:    true,
    uglify:   false,
    presets:  ['keyPress', 'buttonPress', 'focus']
  })
    .pipe($.size())
    .pipe(gulp.dest(paths.preboot.exampleDest));

});

// build verison of preboot to be used for karma testing
gulp.task('preboot.karma', function() {

      var b = browserify({
        entries: [paths.preboot.karmaEntryPoint],
        basedir: paths.preboot.clientRoot,
        browserField: false
      });

      return b.bundle()
        .pipe(source('preboot_karma.js'))
        .pipe(gulp.dest(paths.preboot.karmaDest));

});

gulp.task('build.typescript', ['build.typescript.project']);

gulp.task('build.typescript.project', function() {

  return tsProject.src().
    pipe($.typescript(tsProject)).
    pipe($.size()).
    pipe(gulp.dest(tsProject.config.compilerOptions.outDir));

});

gulp.task('build.typescript.all', function() {

  return gulp.src(paths.files.ts).
    pipe($.typescript(tsProject)).
    pipe($.size()).
    pipe(gulp.dest(tsProject.config.compilerOptions.outDir));

});

gulp.task('changelog', function() {

  return $.conventionalChangelog({
    preset: 'angular'
  }).
  pipe(fs.createWriteStream(paths.changelog.filename));

});

gulp.task('clean', function() {

  return $.del(paths.cleanable, function (err, paths) {
    if (paths.length <= 0) {
      console.log('Nothing to clean.')
    } else {
      console.log('Deleted folders:\n', paths.join('\n'));
    }
  });

});

gulp.task('debug', function() {

  return gulp.src(paths.serverIndex).pipe($.nodeInspector());

});

gulp.task('jasmine', function() {

  var terminalReporter = new $.jasmineReporters.TerminalReporter({
    verbose: 3,
    showStack: true,
    color: true
  });

  var SpecReporter = require('jasmine-spec-reporter');
  var specReporter = new SpecReporter();

  return gulp.src(paths.specs).
    pipe($.jasmine({
      verbose: true,
      includeStackTrace: true,
      reporter: specReporter
    }));

});

gulp.task('karma', ['karma.preboot']);

gulp.task('karma.preboot', function(done){

  var karma = new $.karma.Server({
    port: 9201,
    runnerPort: 9301,
    captureTimeout: 20000,
    growl: true,
    colors: true,
    browsers: ['PhantomJS'],
    reporters: ['progress'],
    plugins: [
      'karma-jasmine',
      'karma-phantomjs-launcher',
      'karma-chrome-launcher'
    ],
    frameworks: ['jasmine'],
    singleRun: true,
    autoWatch: false,
    files: [paths.preboot.karmaCode]
  }, done);

  return karma.start();

});

gulp.task('protractor', function() {

  return gulp.src(paths.specs).
    pipe($.protractor.protractor({
      configFile: paths.config.protractor
    })).
    on('error', function(e) { throw e })

})

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

  return gulp.src(paths.files.ts).
    pipe($.tslint()).
    pipe($.tslint.report('verbose'));

});

gulp.task('watch', function(){

  gulp.watch(paths.files.ts, ['build.typescript.all']);
  gulp.watch(paths.specs, ['jasmine']);

});

gulp.task('!browser-sync', function() {

  $.browserSync.init({
    online: false,
    logLevel: 'debug',
    logPrefix: 'Universal',
    server: {
      baseDir: ['./examples'],
      index: './examples',
      directory: true,
      ghostMode: false
    },
    files: [
      './examples/**/*.js'
    ],
    watchOptions: {
      ignored: ['*.js.map', '*_spec.js']
    },
    port: 3000,
    host: serverip
  });

});


// "serve" defaults to nodemon for the moment.
gulp.task('serve', ['!serve.nodemon']);

gulp.task('!serve.nodemon', ['watch'], function() {

  $.livereload.listen();

  $.opn('http://'+serverip+':' + serverport + '/');

  // TODO: refactor config to configuration section
  return $.nodemon({
    verbose: true,
    script: paths.serverIndex,
    ext: 'js ts html',
    ignore: ['\\.git', 'node_modules', '*.js.map', '*_spec.js', 'angular']
  }).
  on('restart', function() {
    gulp.src('index.js').pipe($.livereload());
      // .pipe($.notify('Reloading page, please wait...'));
  });
});

// todo: refactor to better fit in with rest of gulp script
gulp.task('serve.preboot', function() {

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

  server.use('/', serveStatic('dist/preboot'));
  server.use('/', serveStatic('examples'));
  server.use('/', serveIndex('examples'));

  server.listen(serverport);
  reloader.listen({
    port: livereloadport,
    reloadPage: '/preboot/preboot.html'
  });
  open('http://localhost:3000/preboot/preboot.html');

  exec('tsc -w');
  gulp.watch('dist/**/*', ['build']);
  gulp.watch('examples/**/*', function () {
    reloader.reload();
  });

});

