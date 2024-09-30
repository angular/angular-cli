/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Represents a node in the doubly linked list.
 */
interface Node<Key, Value> {
  key: Key;
  value: Value;
  prev: Node<Key, Value> | undefined;
  next: Node<Key, Value> | undefined;
}

/**
 * A Least Recently Used (LRU) cache implementation.
 *
 * This cache stores a fixed number of key-value pairs, and when the cache exceeds its capacity,
 * the least recently accessed items are evicted.
 *
 * @template Key - The type of the cache keys.
 * @template Value - The type of the cache values.
 */
export class LRUCache<Key, Value> {
  /**
   * The maximum number of items the cache can hold.
   */
  capacity: number;

  /**
   * Internal storage for the cache, mapping keys to their associated nodes in the linked list.
   */
  private readonly cache = new Map<Key, Node<Key, Value>>();

  /**
   * Head of the doubly linked list, representing the most recently used item.
   */
  private head: Node<Key, Value> | undefined;

  /**
   * Tail of the doubly linked list, representing the least recently used item.
   */
  private tail: Node<Key, Value> | undefined;

  /**
   * Creates a new LRUCache instance.
   * @param capacity The maximum number of items the cache can hold.
   */
  constructor(capacity: number) {
    this.capacity = capacity;
  }

  /**
   * Gets the value associated with the given key.
   * @param key The key to retrieve the value for.
   * @returns The value associated with the key, or undefined if the key is not found.
   */
  get(key: Key): Value | undefined {
    const node = this.cache.get(key);
    if (node) {
      this.moveToHead(node);

      return node.value;
    }

    return undefined;
  }

  /**
   * Puts a key-value pair into the cache.
   * If the key already exists, the value is updated.
   * If the cache is full, the least recently used item is evicted.
   * @param key The key to insert or update.
   * @param value The value to associate with the key.
   */
  put(key: Key, value: Value): void {
    const cachedNode = this.cache.get(key);
    if (cachedNode) {
      // Update existing node
      cachedNode.value = value;
      this.moveToHead(cachedNode);

      return;
    }

    // Create a new node
    const newNode: Node<Key, Value> = { key, value, prev: undefined, next: undefined };
    this.cache.set(key, newNode);
    this.addToHead(newNode);

    if (this.cache.size > this.capacity) {
      // Evict the LRU item
      const tail = this.removeTail();
      if (tail) {
        this.cache.delete(tail.key);
      }
    }
  }

  /**
   * Adds a node to the head of the linked list.
   * @param node The node to add.
   */
  private addToHead(node: Node<Key, Value>): void {
    node.next = this.head;
    node.prev = undefined;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Removes a node from the linked list.
   * @param node The node to remove.
   */
  private removeNode(node: Node<Key, Value>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Moves a node to the head of the linked list.
   * @param node The node to move.
   */
  private moveToHead(node: Node<Key, Value>): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * Removes the tail node from the linked list.
   * @returns The removed tail node, or undefined if the list is empty.
   */
  private removeTail(): Node<Key, Value> | undefined {
    const node = this.tail;
    if (node) {
      this.removeNode(node);
    }

    return node;
  }
}
