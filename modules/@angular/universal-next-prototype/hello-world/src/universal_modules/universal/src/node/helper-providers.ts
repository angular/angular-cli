import {APP_ID, OpaqueToken} from '@angular/core';
import {DomSharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';
import {DOCUMENT} from '@angular/platform-browser/src/dom/dom_tokens';

import {_appIdRandomProviderFactory, parseDocument} from '@angular/platform-node';


export const UNIVERSAL_APP_ID = new OpaqueToken('UNIVERSAL_APP_ID');


export function escapeRegExp(str): string {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}


export function replaceUniversalAppIf(str, replaceText, updatedText) {
  return str
    .replace(new RegExp('_nghost-'+ escapeRegExp(replaceText), 'g'), '_nghost-' + updatedText)
    .replace(new RegExp('_ngcontent-'+ escapeRegExp(replaceText), 'g'), '_ngcontent-' + updatedText);

}

export function selectorReplaceRegExpFactory(selector: string): RegExp {
  return new RegExp(`<(${ escapeRegExp(selector) })([^>]*)>([\\n\\s\\S]*?)<\\/(${ escapeRegExp(selector) })>`, 'gi');
}

export function linkRefRegExpFactory(selector: string): RegExp {
  return new RegExp(`<(${ escapeRegExp(selector) })([^>]*)rel="stylesheet"([^>]*)>`, 'gi');
}


export function provideUniversalAppId (): Array<any> {
  return [
    { provide: UNIVERSAL_APP_ID, useFactory: _appIdRandomProviderFactory, deps: [] },
    { provide: APP_ID, useValue: '%COMP%'}
  ];
}

export function provideDocument (document: string): Array<any> {
  const DOC: any = {
    provide: DOCUMENT,
    useFactory: (domSharedStylesHost: DomSharedStylesHost) => {
      let newDoc = document
      newDoc = replaceElementTag(newDoc, 'script', 'UNIVERSAL-SCRIPT');
      newDoc = replaceElementTag(newDoc, 'style', 'UNIVERSAL-STYLE');
      newDoc = replaceVoidElementTag(newDoc, 'link', 'UNIVERSAL-LINK', 'meta ');
      var doc: any = parseDocument(newDoc);
      domSharedStylesHost.addHost(doc.head);
      return doc;
    },
    deps: [DomSharedStylesHost]
  }

  return [
    DOC
  ];
}

export function replaceElementTag(str, fromValue, toValue) {
  return str.replace(selectorReplaceRegExpFactory(`${fromValue}`), `<${toValue}$2>$3</${toValue}>`)
}
export function replaceVoidElementTag(str, fromValue, toValue, remove: string = '') {
  return str.replace(linkRefRegExpFactory(`${fromValue}`), `<${remove}${toValue}$2rel="stylesheet"$3>`)
}
export function transformDocument(document: string): string {
  let newDoc = document;
  newDoc = replaceElementTag(newDoc, 'UNIVERSAL-SCRIPT', 'script');
  newDoc = replaceElementTag(newDoc, 'UNIVERSAL-STYLE', 'style');
  newDoc = replaceVoidElementTag(newDoc, 'meta UNIVERSAL-LINK=""', 'link');
  return newDoc;
}
