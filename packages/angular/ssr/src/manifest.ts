/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { ApplicationRef, Type } from '@angular/core';
import type { AngularServerApp } from './app';

/**
 * Manifest for the Angular server application engine, defining entry points.
 */
export interface AngularAppEngineManifest {
  /**
   * A map of entry points for the server application.
   * Each entry consists of:
   * - `key`: The base href.
   * - `value`: A function that returns a promise resolving to an object containing the `AngularServerApp` type.
   */
  entryPoints: Map<string, () => Promise<{ AngularServerApp: typeof AngularServerApp }>>;

  /**
   * The base path for the server application.
   */
  basePath: string;
}

/**
 * Manifest for a specific Angular server application, defining assets and bootstrap logic.
 */
export interface AngularAppManifest {
  /**
   * A record of assets required by the server application.
   * Each entry consists of:
   * - `key`: The path of the asset.
   * - `value`: A function returning a promise that resolves to the file contents.
   */
  assets: Record<string, () => Promise<string>>;

  /**
   * The bootstrap mechanism for the server application.
   * A function that returns a reference to an NgModule or a function returning a promise that resolves to an ApplicationRef.
   */
  bootstrap: () => Type<unknown> | (() => Promise<ApplicationRef>);

  /**
   * Indicates whether critical CSS should be inlined.
   */
  inlineCriticalCss?: boolean;
}

/**
 * Angular app manifest object.
 */
let angularAppManifest: AngularAppManifest | undefined;

/**
 * Sets the Angular app manifest.
 *
 * @param manifest - The manifest object to set.
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
      'Angular app manifest is not set.' +
        `Please ensure you are using the '@angular/build:application' builder to build your server application.`,
    );
  }

  return angularAppManifest;
}

/**
 * Angular app engine manifest object.
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
      'Angular app engine manifest is not set.' +
        `Please ensure you are using the '@angular/build:application' builder to build your server application.`,
    );
  }

  return angularAppEngineManifest;
}
