/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface Schema {
    /**
     * Flag to control whether the CommonModule is imported.
     */
    commonModule: boolean;
    /**
     * Flag to indicate if a dir is created.
     */
    flat: boolean;
    /**
     * Allows specification of the declaring module.
     */
    module?: string;
    /**
     * The name of the module.
     */
    name: string;
    /**
     * The path to create the module.
     */
    path?: string;
    /**
     * The name of the project.
     */
    project: string;
    /**
     * Generates a routing module.
     */
    routing: boolean;
    /**
     * The scope for the generated routing.
     */
    routingScope?: RoutingScope;
    /**
     * Specifies if a spec file is generated.
     */
    spec: boolean;
}

/**
 * The scope for the generated routing.
 */
export enum RoutingScope {
    Child = "Child",
    Root = "Root",
}
