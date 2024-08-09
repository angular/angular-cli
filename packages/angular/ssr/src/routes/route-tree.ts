/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { joinUrlParts, stripTrailingSlash } from '../utils/url';

/**
 * Interface representing the structure of a route node in a nested object representation.
 */
export interface RouteNodeObjectRepresentation {
  /** Optional metadata associated with this route node. */
  metadata?: RouteTreeNodeMetadata;

  /** Optional children nodes of this route node, keyed by their segment values. */
  children?: Record<string, RouteNodeObjectRepresentation>;
}

/**
 * Metadata for a route tree node.
 */
export interface RouteTreeNodeMetadata {
  /** Optional redirect route associated with this node. */
  redirectTo?: string;

  /** The route segment for this node. */
  route: string;
}

/**
 * A node in a route tree.
 */
interface RouteTreeNode {
  /** The value associated with this node (a route segment or wildcard). */
  segment: string;

  /** The insertion index of the route stored at this node or a descendant. */
  insertionIndex: number;

  /** A map of child nodes, keyed by their values. */
  children?: Map<string, RouteTreeNode>;

  /** Indicates if this node is an end node. */
  isEndNode?: boolean;

  /** Optional metadata associated with this node. */
  metadata?: RouteTreeNodeMetadata;
}

/**
 * A route tree implementation for efficient route matching with wildcards.
 */
export class RouteTree {
  /** The root node of the route tree. */
  private root: RouteTreeNode;

  /** A counter to track the insertion order of routes. */
  private insertionIndexCounter = 0;

  /**
   * Creates a new RouteTree.
   * @param rootSegment - (Optional) The segment for the root node (defaults to an empty string).
   */
  constructor(private rootSegment = '') {
    this.root = {
      segment: rootSegment,
      insertionIndex: -1,
    };
  }

  /**
   * Inserts a route into the route tree.
   * @param route - The route to insert.
   * @param metadata - The metadata associated with the route.
   */
  insert(route: string, metadata: Omit<RouteTreeNodeMetadata, 'route'>): void {
    let node = this.root;
    const normalizedRoute = stripTrailingSlash(route);
    const segments = normalizedRoute.split('/');

    for (const segment of segments) {
      // Parameterized route segment, replace it with a wildcard
      const normalizedSegment = segment[0] === ':' ? '*' : segment;
      let childNode = node.children?.get(normalizedSegment);

      if (!childNode) {
        childNode = {
          segment: normalizedSegment,
          insertionIndex: -1,
        };
        node.children ??= new Map();
        node.children.set(normalizedSegment, childNode);
      }

      node = childNode;
    }

    // Store the full route at the leaf node
    node.metadata = {
      route: normalizedRoute,
      ...metadata,
    };
    node.insertionIndex = this.insertionIndexCounter++;
  }

  /**
   * Matches a route against the route tree, returning the best match
   * based on the lowest insertion index.
   * @param route - The route to match.
   * @returns The best matching route or null if no match is found.
   */
  match(route: string): RouteTreeNodeMetadata | null {
    let bestMatchMetadata: RouteTreeNodeMetadata | null = null;
    let lowestIndex = Infinity;

    /**
     * Recursively traverses the route tree to find the best match.
     */
    const traverse = (currentNode: RouteTreeNode, remainingSegments: string[]): void => {
      const { insertionIndex, metadata, children } = currentNode;
      if (!remainingSegments.length) {
        // Reached a leaf node, check if it's a better match
        if (metadata && insertionIndex < lowestIndex) {
          bestMatchMetadata = metadata;
          lowestIndex = insertionIndex;
        }

        return;
      }

      if (!children) {
        return;
      }

      const [segment, ...restSegments] = remainingSegments;

      // Try to match the exact segment
      let childNode = children.get(segment);
      if (childNode) {
        traverse(childNode, restSegments);
      }

      // Try to match with a wildcard
      childNode = children.get('*');
      if (childNode) {
        traverse(childNode, restSegments);
      }
    };

    const segments = stripTrailingSlash(route).split('/');
    traverse(this.root, segments);

    return bestMatchMetadata;
  }

  /**
   * Converts the route tree into a nested object representation.
   * @returns A nested object where each key is a route segment and each value is an object containing
   *          metadata and possibly further nested route segments.
   */
  toObject(): RouteNodeObjectRepresentation {
    const result: RouteNodeObjectRepresentation = {};

    /**
     * Recursively traverses the route tree to build the nested object.
     */
    const traverse = (
      node: RouteTreeNode,
      currentPath: string,
      currentObj: RouteNodeObjectRepresentation,
    ) => {
      if (node.metadata) {
        currentObj.metadata = node.metadata;
      }

      if (node.children) {
        for (const [segment, childNode] of node.children) {
          currentObj.children ??= {};
          currentObj.children[segment] = {};
          traverse(childNode, joinUrlParts(currentPath, segment), currentObj.children[segment]);
        }
      }
    };

    traverse(this.root, '', result);

    return result;
  }

  /**
   * Constructs a RouteTree from a nested object representation.
   * @param nestedObject A nested object where each key is a route segment and each value contains
   *                     metadata and possibly further nested route segments.
   * @returns A RouteTree constructed from the nested object.
   */
  static fromObject(nestedObject: RouteNodeObjectRepresentation): RouteTree {
    const tree = new RouteTree();

    /**
     * Recursively traverses the nested object to insert routes into the tree.
     */
    const traverse = (currentObj: RouteNodeObjectRepresentation, currentPath: string) => {
      if (currentObj.metadata) {
        // Insert the current path with its metadata into the route tree
        tree.insert(currentPath, currentObj.metadata);
      }

      if (currentObj.children) {
        for (const [segment, childObj] of Object.entries(currentObj.children)) {
          // Construct the full path for the child node and recursively traverse it
          traverse(childObj, joinUrlParts(currentPath, segment));
        }
      }
    };

    // Start traversing from the root of the nested object
    traverse(nestedObject, '');

    return tree;
  }
}
