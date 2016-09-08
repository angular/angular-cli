"use strict";
var child_process_1 = require('child_process');
var chalk_1 = require('chalk');
var _processes = [];
function _exec(options, cmd, args) {
    var stdout = '';
    var cwd = process.cwd();
    console.log(chalk_1.white("  =========================================================================================="));
    args = args.filter(function (x) { return x !== undefined; });
    console.log(chalk_1.blue("  Running `" + cmd + " " + args.map(function (x) { return ("\"" + x + "\""); }).join(' ') + "`..."));
    console.log(chalk_1.blue("  CWD: " + cwd));
    var npmProcess = child_process_1.spawn(cmd, args, { cwd: cwd, detached: true });
    npmProcess.stdout.on('data', function (data) {
        stdout += data.toString('utf-8');
        if (options.silent) {
            return;
        }
        data.toString('utf-8')
            .split(/[\n\r]+/)
            .filter(function (line) { return line !== ''; })
            .forEach(function (line) { return console.log('  ' + line); });
    });
    npmProcess.stderr.on('data', function (data) {
        if (options.silent) {
            return;
        }
        data.toString('utf-8')
            .split(/[\n\r]+/)
            .filter(function (line) { return line !== ''; })
            .forEach(function (line) { return console.error(chalk_1.yellow('  ' + line)); });
    });
    _processes.push(npmProcess);
    // Create the error here so the stack shows who called this function.
    var err = new Error("Running \"" + cmd + " " + args.join(' ') + "\" returned error code ");
    return new Promise(function (resolve, reject) {
        npmProcess.on('close', function (code) {
            _processes = _processes.filter(function (p) { return p !== npmProcess; });
            if (code == 0) {
                resolve(stdout);
            }
            else {
                err.message += code + "...";
                reject(err);
            }
        });
        if (options.waitForMatch) {
            npmProcess.stdout.on('data', function (data) {
                if (data.toString().match(options.waitForMatch)) {
                    resolve(stdout);
                }
            });
        }
    });
}
function killAllProcesses(signal) {
    if (signal === void 0) { signal = 'SIGKILL'; }
    _processes.forEach(function (process) { return process.kill(signal); });
    _processes = [];
}
exports.killAllProcesses = killAllProcesses;
function exec(cmd) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    return _exec({}, cmd, args);
}
exports.exec = exec;
function execAndWaitForOutputToMatch(cmd, args, match) {
    return _exec({ waitForMatch: match }, cmd, args);
}
exports.execAndWaitForOutputToMatch = execAndWaitForOutputToMatch;
function ng() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    if (args[0] == 'build') {
        return _exec({ silent: true }, 'ng', args);
    }
    else {
        return _exec({}, 'ng', args);
    }
}
exports.ng = ng;
function npm() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    return _exec({}, 'npm', args);
}
exports.npm = npm;
function git() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    return _exec({}, 'git', args);
}
exports.git = git;
