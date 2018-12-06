
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */


import { BuilderConfiguration } from '@angular-devkit/architect';
import { Path, resolve, virtualFs } from '@angular-devkit/core';
import { BrowserBuilderSchema, NormalizedBrowserBuilderSchema } from '../browser/schema';
import { KarmaBuilderSchema, NormalizedKarmaBuilderSchema } from '../karma/schema';
import { BuildWebpackServerSchema, NormalizedServerBuilderServerSchema } from '../server/schema';
import { normalizeAssetPatterns } from './normalize-asset-patterns';
import { normalizeFileReplacements } from './normalize-file-replacements';
import { normalizeOptimization } from './normalize-optimization';
import { normalizeSourceMaps } from './normalize-source-maps';

export function normalizeBuilderSchema<BuilderConfigurationT extends
    BuilderConfiguration<BrowserBuilderSchema | BuildWebpackServerSchema | KarmaBuilderSchema>,
    OptionsT = BuilderConfigurationT['options']>(
        host: virtualFs.Host<{}>,
        root: Path,
        builderConfig: BuilderConfigurationT,
):
    OptionsT extends BrowserBuilderSchema ? NormalizedBrowserBuilderSchema :
    OptionsT extends BuildWebpackServerSchema ? NormalizedServerBuilderServerSchema :
    // todo should be unknown
    // tslint:disable-next-line:no-any
    OptionsT extends KarmaBuilderSchema ? NormalizedKarmaBuilderSchema : any {
    const { options } = builderConfig;
    const projectRoot = resolve(root, builderConfig.root);
    const syncHost = new virtualFs.SyncDelegateHost(host);

    // todo: this should be unknown
    // tslint:disable-next-line:no-any
    const isKarmaBuilderSchema = (options: any): options is KarmaBuilderSchema =>
        !options.hasOwnProperty('optimization');

    // todo: this should be unknown
    // tslint:disable-next-line:no-any
    const isBuildWebpackServerSchema = (options: any): options is BuildWebpackServerSchema =>
        !options.hasOwnProperty('assets');

    const assets = isBuildWebpackServerSchema(options)
        ? {}
        : {
            assets: normalizeAssetPatterns(
                options.assets,
                syncHost,
                root,
                projectRoot,
                builderConfig.sourceRoot,
            ),
        };

    const normalizedSourceMapOptions = normalizeSourceMaps(options.sourceMap);
    // todo: remove when removing the deprecations
    normalizedSourceMapOptions.vendor
        = normalizedSourceMapOptions.vendor || !!options.vendorSourceMap;

    const optimization = isKarmaBuilderSchema(options)
        ? {}
        : options.optimization || {};

    return {
        // todo remove any casing when using typescript 3.2
        // tslint:disable-next-line:no-any
        ...options as any,
        ...assets,
        fileReplacements: normalizeFileReplacements(options.fileReplacements, syncHost, root),
        optimization: normalizeOptimization(optimization),
        sourceMap: normalizeSourceMaps(options.sourceMap),
    };
}
