// @ignoreDep @angular/core
import * as Path from 'path';

import { Component } from '@angular/core';
import {
  ModuleMetadata,
  MetadataSymbolicCallExpression,
  isClassMetadata,
  isMetadataSymbolicCallExpression,
  isMetadataImportedSymbolReferenceExpression
} from '@angular/compiler-cli';


function hasResources(obj: any): obj is Component {
  return obj.hasOwnProperty('templateUrl') || obj.hasOwnProperty('styleUrls');
}

function findComponentDecoratorMetadata(decorators: any[]): MetadataSymbolicCallExpression {
  return decorators
    .find( entry => {
      if (isMetadataSymbolicCallExpression(entry)) {
        const exp = entry.expression;
        if (isMetadataImportedSymbolReferenceExpression(exp) && exp.module === '@angular/core'
          && exp.name === 'Component') {
          return true;
        }
      }
      return false;
    });
}

export function inlineMetadataBundle(
  relativeTo: string,
  metadataBundle: ModuleMetadata,
  getResource: (resourcePath: string) => string | undefined
): void {
  const { metadata, origins } = metadataBundle;

  Object.keys(metadata).forEach( key => {
    const entry = metadata[key];
    if (isClassMetadata(entry) && entry.decorators) {
      const exp = findComponentDecoratorMetadata(entry.decorators);
      const componentMetadata = exp && exp.arguments && exp.arguments[0];

      if (componentMetadata && hasResources(componentMetadata)) {
        // when no "origins" it is metadata json for specific module, if origins it's flat mode.
        const origin = origins
          ? Path.dirname(Path.resolve(relativeTo, origins[key]))
          : relativeTo
        ;

        if (componentMetadata.templateUrl) {
          const template = getResource(Path.resolve(origin, componentMetadata.templateUrl));
          if (template) {
            delete componentMetadata.templateUrl;
            componentMetadata.template = template;
          }
        }

        if (componentMetadata.styleUrls) {
          componentMetadata.styles = componentMetadata.styleUrls
            .map( stylePath => getResource(Path.resolve(origin, stylePath)) );
          delete componentMetadata.styleUrls;
        }
      }
    }
  });
}
