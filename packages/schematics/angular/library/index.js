"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var core_1 = require("@angular-devkit/core");
var schematics_1 = require("@angular-devkit/schematics");
var tasks_1 = require("@angular-devkit/schematics/tasks");
var dependencies_1 = require("../utility/dependencies");
var json_file_1 = require("../utility/json-file");
var latest_versions_1 = require("../utility/latest-versions");
var paths_1 = require("../utility/paths");
var workspace_1 = require("../utility/workspace");
var workspace_models_1 = require("../utility/workspace-models");
function updateTsConfig(packageName) {
    var paths = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        paths[_i - 1] = arguments[_i];
    }
    return function (host) {
        if (!host.exists('tsconfig.json')) {
            return host;
        }
        var file = new json_file_1.JSONFile(host, 'tsconfig.json');
        var jsonPath = ['compilerOptions', 'paths', packageName];
        var value = file.get(jsonPath);
        file.modify(jsonPath, Array.isArray(value) ? __spreadArray(__spreadArray([], value, true), paths, true) : paths);
    };
}
function addDependenciesToPackageJson() {
    return function (host) {
        [
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: '@angular/compiler-cli',
                version: latest_versions_1.latestVersions.Angular
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: '@angular-devkit/build-angular',
                version: latest_versions_1.latestVersions.DevkitBuildAngular
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: 'ng-packagr',
                version: latest_versions_1.latestVersions['ng-packagr']
            },
            {
                type: dependencies_1.NodeDependencyType.Default,
                name: 'tslib',
                version: latest_versions_1.latestVersions['tslib']
            },
            {
                type: dependencies_1.NodeDependencyType.Dev,
                name: 'typescript',
                version: latest_versions_1.latestVersions['typescript']
            },
        ].forEach(function (dependency) { return (0, dependencies_1.addPackageJsonDependency)(host, dependency); });
        return host;
    };
}
function addLibToWorkspaceFile(options, projectRoot, projectName) {
    return (0, workspace_1.updateWorkspace)(function (workspace) {
        if (workspace.projects.size === 0) {
            workspace.extensions.defaultProject = projectName;
        }
        workspace.projects.add({
            name: projectName,
            root: projectRoot,
            sourceRoot: "".concat(projectRoot, "/src"),
            projectType: workspace_models_1.ProjectType.Library,
            prefix: options.prefix,
            targets: {
                build: {
                    builder: workspace_models_1.Builders.NgPackagr,
                    defaultConfiguration: 'production',
                    options: {
                        project: "".concat(projectRoot, "/ng-package.json")
                    },
                    configurations: {
                        production: {
                            tsConfig: "".concat(projectRoot, "/tsconfig.lib.prod.json")
                        },
                        development: {
                            tsConfig: "".concat(projectRoot, "/tsconfig.lib.json")
                        }
                    }
                },
                test: {
                    builder: workspace_models_1.Builders.Karma,
                    options: {
                        main: "".concat(projectRoot, "/src/test.ts"),
                        tsConfig: "".concat(projectRoot, "/tsconfig.spec.json"),
                        karmaConfig: "".concat(projectRoot, "/karma.conf.js")
                    }
                }
            }
        });
    });
}
function default_1(options) {
    var _this = this;
    return function (host) { return __awaiter(_this, void 0, void 0, function () {
        var prefix, packageName, _a, name_1, workspace, newProjectRoot, folderName, projectRoot, distRoot, pathImportLib, sourceDir, templateSource;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    prefix = options.prefix;
                    packageName = options.name;
                    if (/^@.*\/.*/.test(options.name)) {
                        _a = options.name.split('/'), name_1 = _a[1];
                        options.name = name_1;
                    }
                    return [4 /*yield*/, (0, workspace_1.getWorkspace)(host)];
                case 1:
                    workspace = _b.sent();
                    newProjectRoot = workspace.extensions.newProjectRoot || '';
                    folderName = packageName.startsWith('@') ? packageName.substr(1) : packageName;
                    if (/[A-Z]/.test(folderName)) {
                        folderName = core_1.strings.dasherize(folderName);
                    }
                    projectRoot = (0, core_1.join)((0, core_1.normalize)(newProjectRoot), folderName);
                    distRoot = "dist/".concat(folderName);
                    pathImportLib = "".concat(distRoot, "/").concat(folderName.replace('/', '-'));
                    sourceDir = "".concat(projectRoot, "/src/lib");
                    templateSource = (0, schematics_1.apply)((0, schematics_1.url)('./files'), [
                        (0, schematics_1.applyTemplates)(__assign(__assign(__assign({}, core_1.strings), options), { packageName: packageName, projectRoot: projectRoot, distRoot: distRoot, relativePathToWorkspaceRoot: (0, paths_1.relativePathToWorkspaceRoot)(projectRoot), prefix: prefix, angularLatestVersion: latest_versions_1.latestVersions.Angular.replace(/~|\^/, ''), tsLibLatestVersion: latest_versions_1.latestVersions['tslib'].replace(/~|\^/, ''), folderName: folderName })),
                        (0, schematics_1.move)(projectRoot),
                    ]);
                    return [2 /*return*/, (0, schematics_1.chain)([
                            (0, schematics_1.mergeWith)(templateSource),
                            addLibToWorkspaceFile(options, projectRoot, packageName),
                            options.skipPackageJson ? (0, schematics_1.noop)() : addDependenciesToPackageJson(),
                            options.skipTsConfig ? (0, schematics_1.noop)() : updateTsConfig(packageName, pathImportLib, distRoot),
                            (0, schematics_1.schematic)('module', {
                                name: options.name,
                                commonModule: false,
                                flat: true,
                                path: sourceDir,
                                project: packageName
                            }),
                            (0, schematics_1.schematic)('component', {
                                name: options.name,
                                selector: "".concat(prefix, "-").concat(options.name),
                                inlineStyle: true,
                                inlineTemplate: true,
                                flat: true,
                                path: sourceDir,
                                "export": true,
                                project: packageName
                            }),
                            (0, schematics_1.schematic)('service', {
                                name: options.name,
                                flat: true,
                                path: sourceDir,
                                project: packageName
                            }),
                            function (_tree, context) {
                                if (!options.skipPackageJson && !options.skipInstall) {
                                    context.addTask(new tasks_1.NodePackageInstallTask());
                                }
                            },
                        ])];
            }
        });
    }); };
}
exports["default"] = default_1;
