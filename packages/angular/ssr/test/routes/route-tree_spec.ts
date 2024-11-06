/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { RenderMode } from '../../src/routes/route-config';
import { RouteTree } from '../../src/routes/route-tree';

describe('RouteTree', () => {
  let routeTree: RouteTree;

  beforeEach(() => {
    routeTree = new RouteTree();
  });

  describe('toObject and fromObject', () => {
    it('should convert the route tree to a nested object and back', () => {
      routeTree.insert('/home', { redirectTo: '/home-page', renderMode: RenderMode.Server });
      routeTree.insert('/about', { redirectTo: '/about-page', renderMode: RenderMode.Server });
      routeTree.insert('/products/:id', { renderMode: RenderMode.Server });
      routeTree.insert('/api/details', {
        redirectTo: '/api/details-page',
        renderMode: RenderMode.Server,
      });

      const routeTreeObj = routeTree.toObject();
      expect(routeTreeObj).toEqual([
        { redirectTo: '/home-page', route: '/home', renderMode: RenderMode.Server },
        { redirectTo: '/about-page', route: '/about', renderMode: RenderMode.Server },
        { route: '/products/:id', renderMode: RenderMode.Server },
        { redirectTo: '/api/details-page', route: '/api/details', renderMode: RenderMode.Server },
      ]);

      const newRouteTree = RouteTree.fromObject(routeTreeObj);
      expect(newRouteTree.match('/home')).toEqual({
        redirectTo: '/home-page',
        route: '/home',
        renderMode: RenderMode.Server,
      });
      expect(newRouteTree.match('/about')).toEqual({
        redirectTo: '/about-page',
        route: '/about',
        renderMode: RenderMode.Server,
      });
      expect(newRouteTree.match('/products/123')).toEqual({
        route: '/products/:id',
        renderMode: RenderMode.Server,
      });
      expect(newRouteTree.match('/api/details')).toEqual({
        redirectTo: '/api/details-page',
        route: '/api/details',
        renderMode: RenderMode.Server,
      });
    });

    it('should handle complex route structures when converting to and from object', () => {
      routeTree.insert('/shop/categories/:category/products/:id', {
        redirectTo: '/shop/products',
        renderMode: RenderMode.Server,
      });
      routeTree.insert('/shop/cart', {
        redirectTo: '/shop/cart-page',
        renderMode: RenderMode.Server,
      });

      const routeTreeObj = routeTree.toObject();
      const newRouteTree = RouteTree.fromObject(routeTreeObj);

      expect(newRouteTree.match('/shop/categories/electronics/products/123')).toEqual({
        redirectTo: '/shop/products',
        route: '/shop/categories/:category/products/:id',
        renderMode: RenderMode.Server,
      });
      expect(newRouteTree.match('/shop/cart')).toEqual({
        redirectTo: '/shop/cart-page',
        route: '/shop/cart',
        renderMode: RenderMode.Server,
      });
    });

    it('should construct a RouteTree from a nested object representation', () => {
      const routeTreeObj = [
        { redirectTo: '/home-page', route: '/home', renderMode: RenderMode.Server },
        { redirectTo: '/about-page', route: '/about', renderMode: RenderMode.Server },
        {
          redirectTo: '/api/details-page',
          route: '/api/*/details',
          renderMode: RenderMode.Server,
        },
      ];

      const newRouteTree = RouteTree.fromObject(routeTreeObj);
      expect(newRouteTree.match('/home')).toEqual({
        redirectTo: '/home-page',
        route: '/home',
        renderMode: RenderMode.Server,
      });
      expect(newRouteTree.match('/about')).toEqual({
        redirectTo: '/about-page',
        route: '/about',
        renderMode: RenderMode.Server,
      });
      expect(newRouteTree.match('/api/users/details')).toEqual({
        redirectTo: '/api/details-page',
        route: '/api/*/details',
        renderMode: RenderMode.Server,
      });
      expect(newRouteTree.match('/nonexistent')).toBeUndefined();
    });

    it('should handle an empty RouteTree correctly', () => {
      const routeTreeObj = routeTree.toObject();
      expect(routeTreeObj).toEqual([]);

      const newRouteTree = RouteTree.fromObject(routeTreeObj);
      expect(newRouteTree.match('/any-path')).toBeUndefined();
    });

    it('should preserve insertion order when converting to and from object', () => {
      routeTree.insert('/first', { renderMode: RenderMode.Server });
      routeTree.insert('/:id', { renderMode: RenderMode.Server });
      routeTree.insert('/second', { renderMode: RenderMode.Server });

      const routeTreeObj = routeTree.toObject();
      expect(routeTreeObj).toEqual([
        { route: '/first', renderMode: RenderMode.Server },
        { route: '/:id', renderMode: RenderMode.Server },
        { route: '/second', renderMode: RenderMode.Server },
      ]);

      const newRouteTree = RouteTree.fromObject(routeTreeObj);
      expect(newRouteTree.match('/first')).toEqual({
        route: '/first',
        renderMode: RenderMode.Server,
      });
      expect(newRouteTree.match('/second')).toEqual({
        route: '/:id',
        renderMode: RenderMode.Server,
      });
      expect(newRouteTree.match('/third')).toEqual({
        route: '/:id',
        renderMode: RenderMode.Server,
      });
    });
  });

  describe('match', () => {
    it('should handle empty routes', () => {
      routeTree.insert('', { renderMode: RenderMode.Server });
      expect(routeTree.match('')).toEqual({ route: '', renderMode: RenderMode.Server });
    });

    it('should insert and match basic routes', () => {
      routeTree.insert('/home', { renderMode: RenderMode.Server });
      routeTree.insert('/about', { renderMode: RenderMode.Server });

      expect(routeTree.match('/home')).toEqual({ route: '/home', renderMode: RenderMode.Server });
      expect(routeTree.match('/about')).toEqual({ route: '/about', renderMode: RenderMode.Server });
      expect(routeTree.match('/contact')).toBeUndefined();
    });

    it('should handle wildcard segments', () => {
      routeTree.insert('/api/users', { renderMode: RenderMode.Server });
      routeTree.insert('/api/products', { renderMode: RenderMode.Server });
      routeTree.insert('/api/*/details', { renderMode: RenderMode.Server });

      expect(routeTree.match('/api/users')).toEqual({
        route: '/api/users',
        renderMode: RenderMode.Server,
      });
      expect(routeTree.match('/api/products')).toEqual({
        route: '/api/products',
        renderMode: RenderMode.Server,
      });
      expect(routeTree.match('/api/orders/details')).toEqual({
        route: '/api/*/details',
        renderMode: RenderMode.Server,
      });
    });

    it('should handle catch all (double wildcard) segments', () => {
      routeTree.insert('/api/users', { renderMode: RenderMode.Server });
      routeTree.insert('/api/*/users/**', { renderMode: RenderMode.Server });
      routeTree.insert('/api/**', { renderMode: RenderMode.Server });

      expect(routeTree.match('/api/users')).toEqual({
        route: '/api/users',
        renderMode: RenderMode.Server,
      });
      expect(routeTree.match('/api/products')).toEqual({
        route: '/api/**',
        renderMode: RenderMode.Server,
      });
      expect(routeTree.match('/api/info/users/details')).toEqual({
        route: '/api/*/users/**',
        renderMode: RenderMode.Server,
      });
      expect(routeTree.match('/api/user/details')).toEqual({
        route: '/api/**',
        renderMode: RenderMode.Server,
      });
    });

    it('should prioritize earlier insertions in case of conflicts', () => {
      routeTree.insert('/blog/*', { renderMode: RenderMode.Server });
      routeTree.insert('/blog/article', { redirectTo: 'blog', renderMode: RenderMode.Server });

      expect(routeTree.match('/blog/article')).toEqual({
        route: '/blog/*',
        renderMode: RenderMode.Server,
      });
    });

    it('should handle parameterized segments as wildcards', () => {
      routeTree.insert('/users/:id', { renderMode: RenderMode.Server });
      expect(routeTree.match('/users/123')).toEqual({
        route: '/users/:id',
        renderMode: RenderMode.Server,
      });
    });

    it('should handle complex route structures', () => {
      routeTree.insert('/shop/categories/:category', { renderMode: RenderMode.Server });
      routeTree.insert('/shop/categories/:category/products/:id', {
        renderMode: RenderMode.Server,
      });

      expect(routeTree.match('/shop/categories/electronics')).toEqual({
        route: '/shop/categories/:category',
        renderMode: RenderMode.Server,
      });
      expect(routeTree.match('/shop/categories/electronics/products/456')).toEqual({
        route: '/shop/categories/:category/products/:id',
        renderMode: RenderMode.Server,
      });
    });

    it('should return undefined for unmatched routes', () => {
      routeTree.insert('/foo', { renderMode: RenderMode.Server });
      expect(routeTree.match('/bar')).toBeUndefined();
    });

    it('should handle multiple wildcards in a path', () => {
      routeTree.insert('/a/*/b/*/c', { renderMode: RenderMode.Server });
      expect(routeTree.match('/a/1/b/2/c')).toEqual({
        route: '/a/*/b/*/c',
        renderMode: RenderMode.Server,
      });
    });

    it('should handle trailing slashes', () => {
      routeTree.insert('/foo/', { renderMode: RenderMode.Server });
      expect(routeTree.match('/foo')).toEqual({ route: '/foo', renderMode: RenderMode.Server });
      expect(routeTree.match('/foo/')).toEqual({ route: '/foo', renderMode: RenderMode.Server });
    });

    it('should handle case-sensitive matching', () => {
      routeTree.insert('/case', { renderMode: RenderMode.Server });
      expect(routeTree.match('/CASE')).toBeUndefined();
    });

    it('should handle routes with special characters', () => {
      routeTree.insert('/path with spaces', { renderMode: RenderMode.Server });
      routeTree.insert('/path/with/slashes', { renderMode: RenderMode.Server });
      expect(routeTree.match('/path with spaces')).toEqual({
        route: '/path with spaces',
        renderMode: RenderMode.Server,
      });
      expect(routeTree.match('/path/with/slashes')).toEqual({
        route: '/path/with/slashes',
        renderMode: RenderMode.Server,
      });
    });
  });
});
