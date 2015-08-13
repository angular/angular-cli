/// <reference path="../../../tsd_typings/tsd.d.ts"/>

import 'reflect-metadata';
import {LocationStrategy} from 'angular2/src/router/location_strategy';
import {ServerLocationStrategy, locationInjectables} from '../src/server_router';
import {Component, Directive, View} from 'angular2/annotations';
import {routerDirectives, routerInjectables, RouteConfig, Router} from 'angular2/router';

/**
 * These tests are pretty basic, but just have something in
 * place that we can expand in the future
 */
describe('server_router', () => {
    
    var serverLocationStrategy: ServerLocationStrategy = null;
    
    beforeAll( () => {
        serverLocationStrategy = new ServerLocationStrategy();
    });
    afterAll( () => {
        serverLocationStrategy = null;
    });

    describe('ServerLocationStrategy', () => {
        it('should be defined', () => {    
            expect(serverLocationStrategy).toBeDefined();
        });
        
        describe('should have all methods defined and functional', () => {
                        
            it('should have method path()', () => {
                spyOn(serverLocationStrategy, 'path');
                serverLocationStrategy.path();
                expect(serverLocationStrategy.path).toHaveBeenCalled();
            });
            
            it('should have method forward()', () => {
                spyOn(serverLocationStrategy, 'forward');
                serverLocationStrategy.forward();
                expect(serverLocationStrategy.forward).toHaveBeenCalled();
            });
            
            it('should have method back()', () => {
                spyOn(serverLocationStrategy, 'back');
                serverLocationStrategy.back();
                expect(serverLocationStrategy.back).toHaveBeenCalled();
            });
            
            it('should have method getBaseHref()', () => {
                spyOn(serverLocationStrategy, 'getBaseHref').and.callThrough();
                var baseHref = serverLocationStrategy.getBaseHref();
                expect(serverLocationStrategy.getBaseHref).toHaveBeenCalled();
                expect(baseHref).toEqual('/');
            });
            
            it('should have method onPopState()', () => {
                spyOn(serverLocationStrategy, 'onPopState');
                var fn = () => {};
                serverLocationStrategy.onPopState(fn);
                expect(serverLocationStrategy.onPopState).toHaveBeenCalled();
                expect(serverLocationStrategy.onPopState).toHaveBeenCalledWith(fn);
            });
            
            it('should have method pushState()', () => {
                spyOn(serverLocationStrategy, 'pushState');
                var opts = {
                    state: {},
                    title: 'foo',
                    url: '/bar'
                };
                serverLocationStrategy.pushState(opts.state, opts.title, opts.url);
                expect(serverLocationStrategy.pushState).toHaveBeenCalled();
                expect(serverLocationStrategy.pushState).toHaveBeenCalledWith(opts.state, opts.title, opts.url);
            });
            
            
        });
        
    });
	
});
