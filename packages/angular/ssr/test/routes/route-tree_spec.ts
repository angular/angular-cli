/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { RouteTree } from '../../src/routes/route-tree';

describe('RouteTree', () => {
  let routeTree: RouteTree;

  beforeEach(() => {
    routeTree = new RouteTree();
  });

  describe('toObject and fromObject', () => {
    it('should convert the route tree to a nested object and back', () => {
      routeTree.insert('/home', { redirectTo: '/home-page' });
      routeTree.insert('/about', { redirectTo: '/about-page' });
      routeTree.insert('/products/:id', {});
      routeTree.insert('/api/details', { redirectTo: '/api/details-page' });

      const routeTreeObj = routeTree.toObject();
      expect(routeTreeObj).toEqual([
        { redirectTo: '/home-page', route: '/home' },
        { redirectTo: '/about-page', route: '/about' },
        { route: '/products/:id' },
        { redirectTo: '/api/details-page', route: '/api/details' },
      ]);

      const newRouteTree = RouteTree.fromObject(routeTreeObj);
      expect(newRouteTree.match('/home')).toEqual({ redirectTo: '/home-page', route: '/home' });
      expect(newRouteTree.match('/about')).toEqual({ redirectTo: '/about-page', route: '/about' });
      expect(newRouteTree.match('/products/123')).toEqual({ route: '/products/:id' });
      expect(newRouteTree.match('/api/details')).toEqual({
        redirectTo: '/api/details-page',
        route: '/api/details',
      });
    });

    it('should handle complex route structures when converting to and from object', () => {
      routeTree.insert('/shop/categories/:category/products/:id', { redirectTo: '/shop/products' });
      routeTree.insert('/shop/cart', { redirectTo: '/shop/cart-page' });

      const routeTreeObj = routeTree.toObject();
      const newRouteTree = RouteTree.fromObject(routeTreeObj);

      expect(newRouteTree.match('/shop/categories/electronics/products/123')).toEqual({
        redirectTo: '/shop/products',
        route: '/shop/categories/:category/products/:id',
      });
      expect(newRouteTree.match('/shop/cart')).toEqual({
        redirectTo: '/shop/cart-page',
        route: '/shop/cart',
      });
    });

    it('should construct a RouteTree from a nested object representation', () => {
      const routeTreeObj = [
        { redirectTo: '/home-page', route: '/home' },
        { redirectTo: '/about-page', route: '/about' },
        {
          redirectTo: '/api/details-page',
          route: '/api/*/details',
        },
      ];

      const newRouteTree = RouteTree.fromObject(routeTreeObj);
      expect(newRouteTree.match('/home')).toEqual({ redirectTo: '/home-page', route: '/home' });
      expect(newRouteTree.match('/about')).toEqual({ redirectTo: '/about-page', route: '/about' });
      expect(newRouteTree.match('/api/users/details')).toEqual({
        redirectTo: '/api/details-page',
        route: '/api/*/details',
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
      routeTree.insert('/first', {});
      routeTree.insert('/:id', {});
      routeTree.insert('/second', {});

      const routeTreeObj = routeTree.toObject();
      expect(routeTreeObj).toEqual([{ route: '/first' }, { route: '/:id' }, { route: '/second' }]);

      const newRouteTree = RouteTree.fromObject(routeTreeObj);
      expect(newRouteTree.match('/first')).toEqual({ route: '/first' });
      expect(newRouteTree.match('/second')).toEqual({ route: '/:id' });
      expect(newRouteTree.match('/third')).toEqual({ route: '/:id' });
    });
  });

  describe('match', () => {
    it('should handle empty routes', () => {
      routeTree.insert('', {});
      expect(routeTree.match('')).toEqual({ route: '' });
    });

    it('should insert and match basic routes', () => {
      routeTree.insert('/home', {});
      routeTree.insert('/about', {});

      expect(routeTree.match('/home')).toEqual({ route: '/home' });
      expect(routeTree.match('/about')).toEqual({ route: '/about' });
      expect(routeTree.match('/contact')).toBeUndefined();
    });

    it('should handle wildcard segments', () => {
      routeTree.insert('/api/users', {});
      routeTree.insert('/api/products', {});
      routeTree.insert('/api/*/details', {});

      expect(routeTree.match('/api/users')).toEqual({ route: '/api/users' });
      expect(routeTree.match('/api/products')).toEqual({ route: '/api/products' });
      expect(routeTree.match('/api/orders/details')).toEqual({ route: '/api/*/details' });
    });

    it('should handle catch all (double wildcard) segments', () => {
      routeTree.insert('/api/users', {});
      routeTree.insert('/api/*/users/**', {});
      routeTree.insert('/api/**', {});

      expect(routeTree.match('/api/users')).toEqual({ route: '/api/users' });
      expect(routeTree.match('/api/products')).toEqual({ route: '/api/**' });
      expect(routeTree.match('/api/info/users/details')).toEqual({ route: '/api/*/users/**' });
      expect(routeTree.match('/api/user/details')).toEqual({ route: '/api/**' });
    });

    it('should prioritize earlier insertions in case of conflicts', () => {
      routeTree.insert('/blog/*', {});
      routeTree.insert('/blog/article', { redirectTo: 'blog' });

      expect(routeTree.match('/blog/article')).toEqual({ route: '/blog/*' });
    });

    it('should handle parameterized segments as wildcards', () => {
      routeTree.insert('/users/:id', {});
      expect(routeTree.match('/users/123')).toEqual({ route: '/users/:id' });
    });

    it('should handle complex route structures', () => {
      routeTree.insert('/shop/categories/:category', {});
      routeTree.insert('/shop/categories/:category/products/:id', {});

      expect(routeTree.match('/shop/categories/electronics')).toEqual({
        route: '/shop/categories/:category',
      });
      expect(routeTree.match('/shop/categories/electronics/products/456')).toEqual({
        route: '/shop/categories/:category/products/:id',
      });
    });

    it('should return undefined for unmatched routes', () => {
      routeTree.insert('/foo', {});
      expect(routeTree.match('/bar')).toBeUndefined();
    });

    it('should handle multiple wildcards in a path', () => {
      routeTree.insert('/a/*/b/*/c', {});
      expect(routeTree.match('/a/1/b/2/c')).toEqual({ route: '/a/*/b/*/c' });
    });

    it('should handle trailing slashes', () => {
      routeTree.insert('/foo/', {});
      expect(routeTree.match('/foo')).toEqual({ route: '/foo' });
      expect(routeTree.match('/foo/')).toEqual({ route: '/foo' });
    });

    it('should handle case-sensitive matching', () => {
      routeTree.insert('/case', {});
      expect(routeTree.match('/CASE')).toBeUndefined();
    });

    it('should handle routes with special characters', () => {
      routeTree.insert('/path with spaces', {});
      routeTree.insert('/path/with/slashes', {});
      expect(routeTree.match('/path with spaces')).toEqual({ route: '/path with spaces' });
      expect(routeTree.match('/path/with/slashes')).toEqual({ route: '/path/with/slashes' });
    });
  });
});
