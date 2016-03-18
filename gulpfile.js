var path = require('path');
var http = require('http');
var fs = require('fs');
var child_process = require('child_process');
var package = require('./package.json');

// Gulp and Plugins
var gulp = require('gulp');
var $ = require('gulp-load-plugins')({
  pattern: [
    'gulp-*',
    'gulp.*',
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
    protractor: root('/protractor.conf.js')
  },

  cleanable: rootDir([
    './dist/',
    './tsd_typings/',
    './typings/',
    './node_modules/',
    './modules/**/node_modules',
    './modules/**/typings',
    './modules/**/dist'
  ]),

  files: {
    ts: rootDir([
      './modules/**/*.ts',
      './examples/**/*.ts'
    ])
  },

  changelog: {
    filename: root('CHANGELOG.md')
  },

  serverIndex: root('/index.js'),

  specs: rootDir([
    'dist/**/*_spec.js'
  ]),

  e2e: rootDir([
    'test/**/*.e2e.js'
  ]),

  doc: {
    out: root('documentation/'),
    json: root('documentation/api.json'),
    theme: 'minimal'
  }

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
  }

}

// Tasks definitions

gulp.task('default', function(done) {

  var tasks = [
    'lint',
    // 'test'
  ];

  return $.runSequence(tasks, done);

});

gulp.task('ci', function(done) {

  var tasks = [
    'lint',
    // 'test'
    // 'protractor'
  ];

  return $.runSequence(tasks, done);

});

// Build

gulp.task('build.typescript', ['build.typescript.project']);

gulp.task('build.typescript.project', ['clean.dist'], function() {

  return TS_PROJECT.src().
  pipe($.typescript(TS_PROJECT)).
  pipe($.size()).
  pipe(gulp.dest(TS_PROJECT.config.compilerOptions.outDir));

});

gulp.task('build', [
  'build.typescript'
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

  return $.del(PATHS.cleanable, function(err, paths) {
    if (paths.length <= 0) {
      return console.log('Nothing to clean.');
    }
    return console.log('Deleted folders:\n', paths.join('\n'));
  });

});

gulp.task('clean.dist', function() {

  return $.del('dist', function(err, paths) {
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

gulp.task('protractor', function() {

  return gulp.src(PATHS.e2e).
  pipe($.protractor.protractor({
    configFile: PATHS.config.protractor
  })).
    on('error', function(e) { throw e })
});

gulp.task('protractor.start', function(done) {

  return $.protractor.webdriver_standalone(done);

});

gulp.task('protractor.update', function(done) {

  child_process.
  spawn(getProtractorBinary('webdriver-manager'), ['update'], {
    stdio: 'inherit'
  }).
  once('close', done);

});

gulp.task('lint', function() {

  return gulp.src(PATHS.files.ts.concat([
    '!./modules/*/dist/**'
  ])).
  pipe($.tslint()).
  pipe($.tslint.report('verbose'));

});

//  Watch

gulp.task('watch', function() {

  gulp.watch(PATHS.files.ts, ['build.typescript.project']);
  gulp.watch(PATHS.specs, ['jasmine']);

});

gulp.task('!browser-sync', function() {

  $.browserSync.init(CONFIG.browserSync);

});

// Serve

// "serve" defaults to nodemon for the moment.
gulp.task('serve', ['serve.nodemon']);
gulp.task('server', ['nodemon']);

gulp.task('nodemon', function() {

  $.livereload.listen();

  return $.nodemon(CONFIG.nodemon).
  on('restart', function() {
    gulp.src('index.js').pipe($.livereload());
  });
});

gulp.task('serve.nodemon', ['watch'], function() {

  $.livereload.listen();

  $.opn('http://' + SERVER_IP + ':' + PORT + '/');

  return $.nodemon(CONFIG.nodemon).
  on('restart', function() {
    gulp.src('index.js').pipe($.livereload());
    // .pipe($.notify('Reloading page, please wait...'));
  });
});

// Documentation

var availableModules = [
  'express-engine',
  'grunt-prerender',
  'gulp-prerender',
  'hapi-engine',
  'preboot',
  'universal',
  'webpack-prerender'
];
// generate a doc gulp task per module
// ie:
//  gulp doc:express-engine
//  gulp doc:universal
//  ...
availableModules.forEach(function(moduleName) {
  var documentationConfig = getDocConfig(moduleName);
  gulp.task('doc:' + moduleName, function() {

    $.util.log('Building documentation for:', $.util.colors.green(
      moduleName));

    return gulp.src(documentationConfig.files)
      .pipe($.typedoc(documentationConfig.config));
  });
});
// add a global (default) doc gulp task for all modules
gulp.task('doc', function(done) {
  $.util.log('Building documentation for all modules:', $.util.colors.green(
    availableModules));

  availableModules = availableModules.map(function(moduleName) {
    return 'doc:' + moduleName
  });
  availableModules.push(done);
  $.runSequence.apply($.runSequence, availableModules);
});

// Utilities

function getDocConfig(moduleName) {
  return {
    files: root('./modules/' + moduleName + '/**/*.ts'),
    config: {
      // TypeScript options (see typescript docs)
      module: 'commonjs',
      target: 'es5',
      includeDeclarations: false,

      // Output options (see typedoc docs)
      out: PATHS.doc.out + moduleName,

      // TypeDoc options (see typedoc docs)
      name: package.name + ' - ' + moduleName,
      theme: PATHS.doc.theme,
      ignoreCompilerErrors: true
    }
  };
}

function getProtractorBinary(binaryName) {
  var winExt = /^win/.test(process.platform) ? '.cmd' : '';
  var pkgPath = require.resolve('protractor');
  var protractorDir = path.resolve(path.join(path.dirname(pkgPath), '..', '..', '.bin'));
  return path.join(protractorDir, '/' + binaryName + winExt);
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
