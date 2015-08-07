var _           = require('lodash');
var argv        = require('yargs').argv;
var fs          = require('fs');
var path        = require('path');
var delim       = path.normalize('/');
var taskRegex   = /^task\.(.*)\.js$/;

var SCRIPTS_FOLDER = 'scripts/gulp-tasks/';
/**
 * Set options defaults that are used for batter tasks
 */
function normalizeOptions(opts) {
  opts = opts || {};

  // command line arguments override options
  _.extend(opts, argv);
  delete opts.$0;
  delete opts._;

  // these values are used in multiple tasks, so set defaults here
  opts.unitTestCode = opts.unitTestCode || 'test/unit/**/*.js';
  opts.unitTargetCode = opts.unitTargetCode || 'lib/**/*.js';
  opts.testDir = opts.testDir || 'test';
  opts.rootDir = opts.rootDir || process.cwd();
  opts.targetDir = opts.targetDir || (opts.rootDir + '/lib');
  opts.tasksets = _.extend({ 'default': ['lint', 'test'] }, opts.tasksets);

  return opts;
}

/**
 * Whip up tasks by adding them to gulpkl
 */
function whip(gulp, opts) {
  opts = normalizeOptions(opts);

  // tasksets can be set in the gulpfile
  var tasks = _.extend({}, opts.tasksets);
  var buildDir = process.cwd() + delim + SCRIPTS_FOLDER;
  var buildFiles = fs.readdirSync(buildDir);

  _.each(buildFiles, function (buildFile) {
    var taskName, task;

    // if the file name starts with 'task.' then it is a task file
    if (taskRegex.test(buildFile)) {

      // the task name is the middle part of the file name (i.e. blah for task.blah.js)
      taskName = buildFile.match(taskRegex)[1];
      task = require(buildDir + delim + buildFile)(gulp, opts);

      // if task is function or an object with deps and task
      if (_.isFunction(task) || (task.deps && task.task)) {
        tasks[taskName] = task;
      }
      // else if it's an object, then there are subtasks
      else if (_.isObject(task)) {
        _.each(task, function (subtask, subtaskName) {
          var fullTaskName = subtaskName === '' ? taskName : taskName + '.' + subtaskName;
          tasks[fullTaskName] = subtask;
        });
      }
      else {
        throw new Error(buildDir + delim + buildFile + ' is invalid');
      }
    }
  });

  // now we have all the tasks in an object so let's add them to gulp
  _.each(tasks, function (task, taskName) {
    if (_.isFunction(task) || _.isArray(task)) {
      gulp.task(taskName, task);
    }
    else if (task.deps && task.task) {
      gulp.task(taskName, task.deps, task.task);
    }
    else {
      throw new Error('Invalid task for ' + taskName);
    }
  });
}

// export whip to be used in every gulpfile
module.exports = {
  normalizeOptions: normalizeOptions,
  whip: whip
};
