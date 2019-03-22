/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderOutput, createBuilder } from '@angular-devkit/architect/src/index2';
import {
  Path,
  experimental,
  getSystemPath,
  json,
  logging,
  normalize,
  resolve, schema, virtualFs,
} from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { Stats } from 'fs';
import * as path from 'path';
import { from, of } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import * as ts from 'typescript'; // tslint:disable-line:no-implicit-dependencies
import { runWebpack } from '../../../build_webpack/src/webpack/index2';
import { WebpackConfigOptions } from '../angular-cli-files/models/build-options';
import {
  getAotConfig,
  getCommonConfig,
  getNonAotConfig,
  getServerConfig,
  getStatsConfig,
  getStylesConfig,
} from '../angular-cli-files/models/webpack-configs';
import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
import { requireProjectModule } from '../angular-cli-files/utilities/require-project-module';
import {
  NormalizedWebpackServerBuilderSchema, defaultProgress,
  deleteOutputDir,
  normalizeWebpackServerSchema,
} from '../utils';
import { Schema as BuildWebpackServerSchema } from './schema';
const webpackMerge = require('webpack-merge');


// If success is true, outputPath should be set.
export type ServerBuilderOutput = json.JsonObject & BuilderOutput & {
  outputPath?: string;
};


export default createBuilder<
  json.JsonObject & BuildWebpackServerSchema,
  ServerBuilderOutput
>((options, context) => {
  const host = new virtualFs.AliasHost(new NodeJsSyncHost());
  const root = context.workspaceRoot;

  async function setup() {
    const registry = new schema.CoreSchemaRegistry();
    registry.addPostTransform(schema.transforms.addUndefinedDefaults);

    const workspace = await experimental.workspace.Workspace.fromPath(
      host,
      normalize(context.workspaceRoot),
      registry,
    );
    const projectName = context.target ? context.target.project : workspace.getDefaultProjectName();

    if (!projectName) {
      throw new Error('Must either have a target from the context or a default project.');
    }
    const projectRoot = resolve(
      workspace.root,
      normalize(workspace.getProject(projectName).root),
    );
    const workspaceSourceRoot = workspace.getProject(projectName).sourceRoot;
    const sourceRoot = workspaceSourceRoot !== undefined ? resolve(
      workspace.root,
      normalize(workspaceSourceRoot),
    ) : undefined;

    const normalizedOptions = normalizeWebpackServerSchema(
      host,
      normalize(root),
      projectRoot,
      sourceRoot,
      options,
    );

    return { normalizedOptions, projectRoot };
  }

  return from(setup()).pipe(
    concatMap(v => {
      if (options.deleteOutputPath) {
        return deleteOutputDir(normalize(root), normalize(options.outputPath), host).pipe(
          map(() => v),
        );
      } else {
        return of(v);
      }
    }),
    concatMap(({ normalizedOptions, projectRoot }) => {
      const webpackConfig = buildServerWebpackConfig(
        normalize(root),
        projectRoot,
        host,
        normalizedOptions,
        context.logger.createChild('webpack'),
      );

      return runWebpack(webpackConfig, context);
    }),
    map(output => {
      if (output.success === false) {
        return output as ServerBuilderOutput;
      }

      return {
        ...output,
        outputPath: path.resolve(root, options.outputPath),
      } as ServerBuilderOutput;
    }),
  );
});

export function buildServerWebpackConfig(
  root: Path,
  projectRoot: Path,
  _host: virtualFs.Host<Stats>,
  options: NormalizedWebpackServerBuilderSchema,
  logger: logging.Logger,
) {
  let wco: WebpackConfigOptions;

  // TODO: make target defaults into configurations instead
  // options = this.addTargetDefaults(options);

  const tsConfigPath = getSystemPath(normalize(resolve(root, normalize(options.tsConfig))));
  const tsConfig = readTsconfig(tsConfigPath);

  const projectTs = requireProjectModule(getSystemPath(projectRoot), 'typescript') as typeof ts;

  const supportES2015 = tsConfig.options.target !== projectTs.ScriptTarget.ES3
    && tsConfig.options.target !== projectTs.ScriptTarget.ES5;

  const buildOptions: typeof wco['buildOptions'] = {
    ...options as {} as typeof wco['buildOptions'],
  };

  wco = {
    root: getSystemPath(root),
    projectRoot: getSystemPath(projectRoot),
    // TODO: use only this.options, it contains all flags and configs items already.
    buildOptions: {
      ...buildOptions,
      buildOptimizer: false,
      aot: true,
      platform: 'server',
      scripts: [],
      styles: [],
    },
    tsConfig,
    tsConfigPath,
    supportES2015,
    logger,
  };

  wco.buildOptions.progress = defaultProgress(wco.buildOptions.progress);

  const webpackConfigs: {}[] = [
    getCommonConfig(wco),
    getServerConfig(wco),
    getStylesConfig(wco),
    getStatsConfig(wco),
  ];

  if (wco.buildOptions.main || wco.buildOptions.polyfills) {
    const typescriptConfigPartial = wco.buildOptions.aot
      ? getAotConfig(wco)
      : getNonAotConfig(wco);
    webpackConfigs.push(typescriptConfigPartial);
  }

  return webpackMerge(webpackConfigs);
}
