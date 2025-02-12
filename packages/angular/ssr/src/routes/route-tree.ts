/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { addLeadingSlash } from '../utils/url';
import { RenderMode } from './route-config';

/**
 * Represents the serialized format of a route tree as an array of node metadata objects.
 * Each entry in the array corresponds to a specific node's metadata within the route tree.
 */
export type SerializableRouteTreeNode = ReadonlyArray<RouteTreeNodeMetadata>;

/**
 * Represents metadata for a route tree node, excluding the 'route' path segment.
 */
export type RouteTreeNodeMetadataWithoutRoute = Omit<RouteTreeNodeMetadata, 'route'>;

/**
 * Describes metadata associated with a node in the route tree.
 * This metadata includes information such as the route path and optional redirect instructions.
 */
export interface RouteTreeNodeMetadata {
  /**
   * Optional redirect path associated with this node.
   * This defines where to redirect if this route is matched.
   */
  redirectTo?: string;

  /**
   * The route path for this node.
   *
   * A "route" is a URL path or pattern that is used to navigate to different parts of a web application.
   * It is made up of one or more segments separated by slashes `/`. For instance, in the URL `/products/details/42`,
   * the full route is `/products/details/42`, with segments `products`, `details`, and `42`.
   *
   * Routes define how URLs map to views or components in an application. Each route segment contributes to
   * the overall path that determines which view or component is displayed.
   *
   * - **Static Routes**: These routes have fixed segments. For example, `/about` or `/contact`.
   * - **Parameterized Routes**: These include dynamic segments that act as placeholders, such as `/users/:id`,
   *   where `:id` could be any user ID.
   *
   * In the context of `RouteTreeNodeMetadata`, the `route` property represents the complete path that this node
   * in the route tree corresponds to. This path is used to determine how a specific URL in the browser maps to the
   * structure and content of the application.
   */
  route: string;

  /**
   * Optional status code to return for this route.
   */
  status?: number;

  /**
   * Optional additional headers to include in the response for this route.
   */
  headers?: Record<string, string>;

  /**
   * Specifies the rendering mode used for this route.
   */
  renderMode: RenderMode;

  /**
   * A list of resource that should be preloaded by the browser.
   */
  preload?: readonly string[];
}

/**
 * Represents a node within the route tree structure.
 * Each node corresponds to a route segment and may have associated metadata and child nodes.
 * The `AdditionalMetadata` type parameter allows for extending the node metadata with custom data.
 */
interface RouteTreeNode<AdditionalMetadata extends Record<string, unknown>> {
  /**
   * A map of child nodes, keyed by their corresponding route segment or wildcard.
   */
  children: Map<string, RouteTreeNode<AdditionalMetadata>>;

  /**
   * Optional metadata associated with this node, providing additional information such as redirects.
   */
  metadata?: RouteTreeNodeMetadata & AdditionalMetadata;
}

/**
 * A route tree implementation that supports efficient route matching, including support for wildcard routes.
 * This structure is useful for organizing and retrieving routes in a hierarchical manner,
 * enabling complex routing scenarios with nested paths.
 *
 * @typeParam AdditionalMetadata - Type of additional metadata that can be associated with route nodes.
 */
export class RouteTree<AdditionalMetadata extends Record<string, unknown> = {}> {
  /**
   * The root node of the route tree.
   * All routes are stored and accessed relative to this root node.
   */
  private readonly root = this.createEmptyRouteTreeNode();

  /**
   * Inserts a new route into the route tree.
   * The route is broken down into segments, and each segment is added to the tree.
   * Parameterized segments (e.g., :id) are normalized to wildcards (*) for matching purposes.
   *
   * @param route - The route path to insert into the tree.
   * @param metadata - Metadata associated with the route, excluding the route path itself.
   */
  insert(route: string, metadata: RouteTreeNodeMetadataWithoutRoute & AdditionalMetadata): void {
    let node = this.root;
    const segments = this.getPathSegments(route);
    const normalizedSegments: string[] = [];

    for (const segment of segments) {
      // Replace parameterized segments (e.g., :id) with a wildcard (*) for matching
      const normalizedSegment = segment[0] === ':' ? '*' : segment;
      let childNode = node.children.get(normalizedSegment);
      if (!childNode) {
        childNode = this.createEmptyRouteTreeNode();
        node.children.set(normalizedSegment, childNode);
      }

      node = childNode;
      normalizedSegments.push(normalizedSegment);
    }

    // At the leaf node, store the full route and its associated metadata
    node.metadata = {
      ...metadata,
      route: addLeadingSlash(normalizedSegments.join('/')),
    };
  }

  /**
   * Matches a given route against the route tree and returns the best matching route's metadata.
   * The best match is determined by the lowest insertion index, meaning the earliest defined route
   * takes precedence.
   *
   * @param route - The route path to match against the route tree.
   * @returns The metadata of the best matching route or `undefined` if no match is found.
   */
  match(route: string): (RouteTreeNodeMetadata & AdditionalMetadata) | undefined {
    const segments = this.getPathSegments(route);

    return this.traverseBySegments(segments)?.metadata;
  }

  /**
   * Converts the route tree into a serialized format representation.
   * This method converts the route tree into an array of metadata objects that describe the structure of the tree.
   * The array represents the routes in a nested manner where each entry includes the route and its associated metadata.
   *
   * @returns An array of `RouteTreeNodeMetadata` objects representing the route tree structure.
   *          Each object includes the `route` and associated metadata of a route.
   */
  toObject(): SerializableRouteTreeNode {
    return Array.from(this.traverse());
  }

  /**
   * Constructs a `RouteTree` from an object representation.
   * This method is used to recreate a `RouteTree` instance from an array of metadata objects.
   * The array should be in the format produced by `toObject`, allowing for the reconstruction of the route tree
   * with the same routes and metadata.
   *
   * @param value - An array of `RouteTreeNodeMetadata` objects that represent the serialized format of the route tree.
   *                Each object should include a `route` and its associated metadata.
   * @returns A new `RouteTree` instance constructed from the provided metadata objects.
   */
  static fromObject(value: SerializableRouteTreeNode): RouteTree {
    const tree = new RouteTree();

    for (const { route, ...metadata } of value) {
      tree.insert(route, metadata);
    }

    return tree;
  }

  /**
   * A generator function that recursively traverses the route tree and yields the metadata of each node.
   * This allows for easy and efficient iteration over all nodes in the tree.
   *
   * @param node - The current node to start the traversal from. Defaults to the root node of the tree.
   */
  *traverse(node = this.root): Generator<RouteTreeNodeMetadata & AdditionalMetadata> {
    if (node.metadata) {
      yield node.metadata;
    }

    for (const childNode of node.children.values()) {
      yield* this.traverse(childNode);
    }
  }

  /**
   * Extracts the path segments from a given route string.
   *
   * @param route - The route string from which to extract segments.
   * @returns An array of path segments.
   */
  private getPathSegments(route: string): string[] {
    return route.split('/').filter(Boolean);
  }

  /**
   * Recursively traverses the route tree from a given node, attempting to match the remaining route segments.
   * If the node is a leaf node (no more segments to match) and contains metadata, the node is yielded.
   *
   * This function prioritizes exact segment matches first, followed by wildcard matches (`*`),
   * and finally deep wildcard matches (`**`) that consume all segments.
   *
   * @param segments - The array of route path segments to match against the route tree.
   * @param node - The current node in the route tree to start traversal from. Defaults to the root node.
   * @param currentIndex - The index of the segment in `remainingSegments` currently being matched.
   * Defaults to `0` (the first segment).
   *
   * @returns The node that best matches the remaining segments or `undefined` if no match is found.
   */
  private traverseBySegments(
    segments: string[],
    node = this.root,
    currentIndex = 0,
  ): RouteTreeNode<AdditionalMetadata> | undefined {
    if (currentIndex >= segments.length) {
      return node.metadata ? node : node.children.get('**');
    }

    if (!node.children.size) {
      return undefined;
    }

    const segment = segments[currentIndex];

    // 1. Attempt exact match with the current segment.
    const exactMatch = node.children.get(segment);
    if (exactMatch) {
      const match = this.traverseBySegments(segments, exactMatch, currentIndex + 1);
      if (match) {
        return match;
      }
    }

    // 2. Attempt wildcard match ('*').
    const wildcardMatch = node.children.get('*');
    if (wildcardMatch) {
      const match = this.traverseBySegments(segments, wildcardMatch, currentIndex + 1);
      if (match) {
        return match;
      }
    }

    // 3. Attempt double wildcard match ('**').
    return node.children.get('**');
  }

  /**
   * Creates an empty route tree node.
   * This helper function is used during the tree construction.
   *
   * @returns A new, empty route tree node.
   */
  private createEmptyRouteTreeNode(): RouteTreeNode<AdditionalMetadata> {
    return {
      children: new Map(),
    };
  }
}
