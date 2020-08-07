import { HttpParams } from '@angular/common/http';
import { ɵTransferHttpCacheInterceptor as TransferHttpCacheInterceptor } from '@nguniversal/common';
import { of } from 'rxjs';

function mockAppRef(): any {
  return {
    isStable: of(true)
  };
}

function mockTransferState(): any {
  return {
    store: {}
  };
}

describe('TransferHttp', () => {
  describe('keys', () => {
    it('should encode url params', () => {
      const interceptor = new TransferHttpCacheInterceptor(mockAppRef(), mockTransferState());
      const key = interceptor['makeCacheKey']('GET', 'https://google.com/api',
       new HttpParams().append('foo', 'bar'));
      expect(key).toEqual('G.https://google.com/api?foo=bar');
    });
    it('should sort the keys by unicode points', () => {
      const interceptor = new TransferHttpCacheInterceptor(mockAppRef(), mockTransferState());
      const key = interceptor['makeCacheKey']('GET', 'https://google.com/api',
        new HttpParams().append('b', 'foo').append('a', 'bar'));
      expect(key).toEqual('G.https://google.com/api?a=bar&b=foo');
    });
    it('should make equal keys if order of params changes', () => {
      const interceptor = new TransferHttpCacheInterceptor(mockAppRef(), mockTransferState());
      const key1 = interceptor['makeCacheKey']('GET', 'https://google.com/api',
        new HttpParams().append('a', 'bar').append('b', 'foo'));
      const key2 = interceptor['makeCacheKey']('GET', 'https://google.com/api',
        new HttpParams().append('b', 'foo').append('a', 'bar'));
      expect(key1).toEqual(key2);
    });
    it('should encode arrays in url params', () => {
      const interceptor = new TransferHttpCacheInterceptor(mockAppRef(), mockTransferState());
      const key = interceptor['makeCacheKey']('GET', 'https://google.com/api',
        new HttpParams().append('b', 'xyz').append('a', 'foo').append('a', 'bar'));
      expect(key).toEqual('G.https://google.com/api?a=foo,bar&b=xyz');
    });
  });
});
