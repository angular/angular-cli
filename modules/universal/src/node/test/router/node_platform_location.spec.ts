import {describe, it, expect, beforeEach} from 'angular2/testing';

import {format, parse} from 'url';
import {PlatformLocation} from 'angular2/router';
import {NodePlatformLocation} from '../../router/node_platform_location';

function normalizeProperties({ pathname, search, hash }) {
  pathname = pathname || '';
  search = search || '';
  hash = hash || '';

  if (search && search[0] !== '?') { search = '?' + search; }
  if (hash && hash[0] !== '#') { hash = '#' + hash; }

  return { pathname, search, hash };
}

function expectProperties(spl: NodePlatformLocation, props) {
  if (typeof props === 'string') {
    props = parse(props);
  }

  props = normalizeProperties(props);

  expect(spl.pathname).toBe(props.pathname);
  expect(spl.search).toBe(props.search);
  expect(spl.hash).toBe(props.hash);
}

function back(spl: NodePlatformLocation, steps) {
  while (steps--) { spl.back(); }
}

function forward(spl: NodePlatformLocation, steps) {
  while (steps--) { spl.forward(); }
}

describe('NodePlatformLocation', () => {

  describe('initialization', () => {
    it('should initialize "pathname", "search" and "hash" properties through "requestUrl" parameter', () => {
      const urls = [
        { pathname: '/some/path', search: 'first=value1&second=value2', hash: 'somehash' },
        { pathname: '/', search: 'somevalue', hash: '' },
        { pathname: '', search: '', hash: '' }
      ];

      for (const urlParts of urls) {
        const spl = new NodePlatformLocation(format(urlParts));
        expectProperties(spl, urlParts);
      }
    });

    it('should set new "pathname"', () => {
      const firstPathname = '/some/pathname';
      const secondPathname = '/another/pathname';
      const spl = new NodePlatformLocation(format({ pathname: firstPathname }));

      expect(spl.pathname).toBe(firstPathname);
      spl.pathname = secondPathname;
      expect(spl.pathname).toBe(secondPathname);
    });

    it('should throw on trying to get base href from DOM', () => {
      const spl = new NodePlatformLocation('/');
      expect(() => spl.getBaseHrefFromDOM()).toThrowError();
    });
  });

  describe('history stack', () => {
    let spl: NodePlatformLocation;

    const requestUrl = format({
      pathname: '/some/path',
      search: 'param=value&another=param',
      hash: 'qwecqpowc'
    });

    const states = [
      { state: 'state1', title: 'title1', url: '/some/url/1' },
      { state: 'state2', title: 'title2', url: '/some/url/2' },
      { state: 'state3', title: 'title3', url: '/some/url/3' }
    ];

    beforeEach(() => {
      spl = new NodePlatformLocation(requestUrl);
    });

    describe('pushState()', () => {
      it('should update "pathname", "search" and "hash" properties', () => {
        expectProperties(spl, requestUrl);

        for (const { state, title, url } of states) {
          spl.pushState(state, title, url);
          expectProperties(spl, url);
        }
      });
    });

    describe('back()', () => {
      beforeEach(() => {
        for (const { state, title, url } of states) {
          spl.pushState(state, title, url);
        }
      });

      it('should update "pathname", "search" and "hash" properties accordig to the previous state', () => {
        for (const { url } of states.concat().reverse()) {
          expectProperties(spl, url);
          spl.back();
        }

        expectProperties(spl, requestUrl);
      });

      it('should call "onPopState" listeners', () => {
        let index = states.length;

        const popStateListener = jasmine.createSpy('popStateListener', (event) => {
          expect(event.type).toBe('popstate');
          expect(event.state).toBe(index ? states[index - 1].state : null);
        });

        spl.onPopState(popStateListener);

        while (index--) {
          spl.back();
          expect(popStateListener).toHaveBeenCalled();
        }
      });

      it('should do nothing if the previous state doesn\'t exist', () => {
        back(spl, states.length);

        const popStateListener = jasmine.createSpy('popStateListener');
        spl.onPopState(popStateListener);

        expectProperties(spl, requestUrl);
        spl.back();
        expectProperties(spl, requestUrl);
        expect(popStateListener).not.toHaveBeenCalled();
      });
    });

    describe('forward()', () => {
      beforeEach(() => {
        for (const { state, title, url } of states) {
          spl.pushState(state, title, url);
        }

        back(spl, states.length);
      });

      it('should update "pathname", "search" and "hash" properties accordig to the next state', () => {
        for (const { url } of states) {
          spl.forward();
          expectProperties(spl, url);
        }
      });

      it('should call "onPopState" listeners', () => {
        let index = 0;

        const popStateListener = jasmine.createSpy('popStateListener', (event) => {
          expect(event.type).toBe('popstate');
          expect(event.state).toBe(index ? states[index - 1].state : null);
        });

        spl.onPopState(popStateListener);

        while (++index < states.length) {
          spl.forward();
          expect(popStateListener).toHaveBeenCalled();
        }
      });

      it('should do nothing if the next state doesn\'t exist', () => {
        forward(spl, states.length);

        const { url } = states[states.length - 1];

        const popStateListener = jasmine.createSpy('popStateListener');
        spl.onPopState(popStateListener);

        expectProperties(spl, url);
        spl.forward();
        expectProperties(spl, url);
        expect(popStateListener).not.toHaveBeenCalled();
      });
    });


    describe('replaceState()', () => {
      it('should update "pathname", "search" and "hash" properties', () => {
        expectProperties(spl, requestUrl);

        for (const { state, title, url } of states) {
          spl.replaceState(state, title, url);
          expectProperties(spl, url);
        }
      });

      it('should not add new state to the history stack', () => {
        const { state, title, url } = states[0];

        expectProperties(spl, requestUrl);
        spl.replaceState(state, title, url);
        expectProperties(spl, url);
        spl.back();
        expectProperties(spl, url);
      });

      it('should not change other states in the history stack', () => {
        for (const { state, title, url } of states) {
          spl.pushState(state, title, url);
        }
        expectProperties(spl, states[states.length - 1].url);
        spl.back();
        expectProperties(spl, states[states.length - 2].url);
        spl.back();
        expectProperties(spl, states[states.length - 3].url);

        const replaceUrl = '/some/replace/url';

        spl.forward();
        spl.replaceState('state', 'title', replaceUrl);
        spl.back();

        expectProperties(spl, states[states.length - 3].url);
        spl.forward();
        expectProperties(spl, replaceUrl);
        spl.forward();
        expectProperties(spl, states[states.length - 1].url);
      });
    });
  });
});
