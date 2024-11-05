/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { SerializableRouteTreeNode } from './routes/route-tree';
import { AngularBootstrap } from './utils/ng';

/**
 * Represents of a server asset stored in the manifest.
 */
export interface ServerAsset {
  /**
   * Retrieves the text content of the asset.
   *
   * @returns A promise that resolves to the asset's content as a string.
   */
  text: () => Promise<string>;

  /**
   * A hash string representing the asset's content.
   */
  hash: string;

  /**
   * The size of the asset's content in bytes.
   */
  size: number;
}

/**
 * Represents the exports of an Angular server application entry point.
 */
export interface EntryPointExports {
  /**
   * A reference to the function that creates an Angular server application instance.
   *
   * @remarks The return type is `unknown` to prevent circular dependency issues.
   */
  ɵgetOrCreateAngularServerApp: () => unknown;

  /**
   * A reference to the function that destroys the `AngularServerApp` instance.
   */
  ɵdestroyAngularServerApp: () => void;
}

/**
 * Manifest for the Angular server application engine, defining entry points.
 */
export interface AngularAppEngineManifest {
  /**
   * A map of entry points for the server application.
   * Each entry in the map consists of:
   * - `key`: The base href for the entry point.
   * - `value`: A function that returns a promise resolving to an object of type `EntryPointExports`.
   */
  readonly entryPoints: ReadonlyMap<string, () => Promise<EntryPointExports>>;

  /**
   * The base path for the server application.
   * This is used to determine the root path of the application.
   */
  readonly basePath: string;
}

/**
 * Manifest for a specific Angular server application, defining assets and bootstrap logic.
 */
export interface AngularAppManifest {
  /**
   * A map of assets required by the server application.
   * Each entry in the map consists of:
   * - `key`: The path of the asset.
   * - `value`: A function returning a promise that resolves to the file contents of the asset.
   */
  readonly assets: ReadonlyMap<string, ServerAsset>;

  /**
   * The bootstrap mechanism for the server application.
   * A function that returns a promise that resolves to an `NgModule` or a function
   * returning a promise that resolves to an `ApplicationRef`.
   */
  readonly bootstrap: () => Promise<AngularBootstrap>;

  /**
   * Indicates whether critical CSS should be inlined into the HTML.
   * If set to `true`, critical CSS will be inlined for faster page rendering.
   */
  readonly inlineCriticalCss?: boolean;

  /**
   * The route tree representation for the routing configuration of the application.
   * This represents the routing information of the application, mapping route paths to their corresponding metadata.
   * It is used for route matching and navigation within the server application.
   */
  readonly routes?: SerializableRouteTreeNode;

  /**
   * An optional string representing the locale or language code to be used for
   * the application, aiding with localization and rendering content specific to the locale.
   */
  readonly locale?: string;
}

/**
 * The Angular app manifest object.
 * This is used internally to store the current Angular app manifest.
 */
let angularAppManifest: AngularAppManifest | undefined;

/**
 * Sets the Angular app manifest.
 *
 * @param manifest - The manifest object to set for the Angular application.
 */
export function setAngularAppManifest(manifest: AngularAppManifest): void {
  angularAppManifest = manifest;
}

/**
 * Gets the Angular app manifest.
 *
 * @returns The Angular app manifest.
 * @throws Will throw an error if the Angular app manifest is not set.
 */
export function getAngularAppManifest(): AngularAppManifest {
  if (!angularAppManifest) {
    throw new Error(
      'Angular app manifest is not set. ' +
        `Please ensure you are using the '@angular/build:application' builder to build your server application.`,
    );
  }

  return angularAppManifest;
}

/**
 * The Angular app engine manifest object.
 * This is used internally to store the current Angular app engine manifest.
 */
let angularAppEngineManifest: AngularAppEngineManifest | undefined;

/**
 * Sets the Angular app engine manifest.
 *
 * @param manifest - The engine manifest object to set.
 */
export function setAngularAppEngineManifest(manifest: AngularAppEngineManifest): void {
  angularAppEngineManifest = manifest;
}

/**
 * Gets the Angular app engine manifest.
 *
 * @returns The Angular app engine manifest.
 * @throws Will throw an error if the Angular app engine manifest is not set.
 */
export function getAngularAppEngineManifest(): AngularAppEngineManifest {
  if (!angularAppEngineManifest) {
    throw new Error(
      'Angular app engine manifest is not set. ' +
        `Please ensure you are using the '@angular/build:application' builder to build your server application.`,
    );
  }

  return angularAppEngineManifest;
}
