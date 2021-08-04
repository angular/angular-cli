/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { createHash } from 'crypto';
import { htmlRewritingStream } from './html-rewriting-stream';

export type LoadOutputFileFunctionType = (file: string) => Promise<string>;

export type CrossOriginValue = 'none' | 'anonymous' | 'use-credentials';

export type Entrypoint = [name: string, isModule: boolean];

export interface AugmentIndexHtmlOptions {
  /* Input contents */
  html: string;
  baseHref?: string;
  deployUrl?: string;
  sri: boolean;
  /** crossorigin attribute setting of elements that provide CORS support */
  crossOrigin?: CrossOriginValue;
  /*
   * Files emitted by the build.
   */
  files: FileInfo[];
  /*
   * Function that loads a file used.
   * This allows us to use different routines within the IndexHtmlWebpackPlugin and
   * when used without this plugin.
   */
  loadOutputFile: LoadOutputFileFunctionType;
  /** Used to sort the inseration of files in the HTML file */
  entrypoints: Entrypoint[];
  /** Used to set the document default locale */
  lang?: string;
}

export interface FileInfo {
  file: string;
  name: string;
  extension: string;
}
/*
 * Helper function used by the IndexHtmlWebpackPlugin.
 * Can also be directly used by builder, e. g. in order to generate an index.html
 * after processing several configurations in order to build different sets of
 * bundles for differential serving.
 */
export async function augmentIndexHtml(params: AugmentIndexHtmlOptions): Promise<string> {
  const { loadOutputFile, files, entrypoints, sri, deployUrl = '', lang, baseHref, html } = params;

  let { crossOrigin = 'none' } = params;
  if (sri && crossOrigin === 'none') {
    crossOrigin = 'anonymous';
  }

  const stylesheets = new Set<string>();
  const scripts = new Map</** file name */ string, /** isModule */ boolean>();

  // Sort files in the order we want to insert them by entrypoint
  for (const [entrypoint, isModule] of entrypoints) {
    for (const { extension, file, name } of files) {
      if (name !== entrypoint || scripts.has(file) || stylesheets.has(file)) {
        continue;
      }

      switch (extension) {
        case '.js':
          // Also, non entrypoints need to be loaded as no module as they can contain problematic code.
          scripts.set(file, isModule);
          break;
        case '.css':
          stylesheets.add(file);
          break;
      }
    }
  }

  let scriptTags: string[] = [];
  for (const [src, isModule] of scripts) {
    const attrs = [`src="${deployUrl}${src}"`];

    // This is also need for non entry-points as they may contain problematic code.
    if (isModule) {
      attrs.push('type="module"');
    } else {
      attrs.push('defer');
    }

    if (crossOrigin !== 'none') {
      attrs.push(`crossorigin="${crossOrigin}"`);
    }

    if (sri) {
      const content = await loadOutputFile(src);
      attrs.push(generateSriAttributes(content));
    }

    scriptTags.push(`<script ${attrs.join(' ')}></script>`);
  }

  let linkTags: string[] = [];
  for (const src of stylesheets) {
    const attrs = [`rel="stylesheet"`, `href="${deployUrl}${src}"`];

    if (crossOrigin !== 'none') {
      attrs.push(`crossorigin="${crossOrigin}"`);
    }

    if (sri) {
      const content = await loadOutputFile(src);
      attrs.push(generateSriAttributes(content));
    }

    linkTags.push(`<link ${attrs.join(' ')}>`);
  }

  const { rewriter, transformedContent } = await htmlRewritingStream(html);
  const baseTagExists = html.includes('<base');

  rewriter
    .on('startTag', (tag) => {
      switch (tag.tagName) {
        case 'html':
          // Adjust document locale if specified
          if (isString(lang)) {
            updateAttribute(tag, 'lang', lang);
          }
          break;
        case 'head':
          // Base href should be added before any link, meta tags
          if (!baseTagExists && isString(baseHref)) {
            rewriter.emitStartTag(tag);
            rewriter.emitRaw(`<base href="${baseHref}">`);

            return;
          }
          break;
        case 'base':
          // Adjust base href if specified
          if (isString(baseHref)) {
            updateAttribute(tag, 'href', baseHref);
          }
          break;
      }

      rewriter.emitStartTag(tag);
    })
    .on('endTag', (tag) => {
      switch (tag.tagName) {
        case 'head':
          for (const linkTag of linkTags) {
            rewriter.emitRaw(linkTag);
          }

          linkTags = [];
          break;
        case 'body':
          // Add script tags
          for (const scriptTag of scriptTags) {
            rewriter.emitRaw(scriptTag);
          }

          scriptTags = [];
          break;
      }

      rewriter.emitEndTag(tag);
    });

  const content = await transformedContent;

  if (linkTags.length || scriptTags.length) {
    // In case no body/head tags are not present (dotnet partial templates)
    return linkTags.join('') + scriptTags.join('') + content;
  }

  return content;
}

function generateSriAttributes(content: string): string {
  const algo = 'sha384';
  const hash = createHash(algo).update(content, 'utf8').digest('base64');

  return `integrity="${algo}-${hash}"`;
}

function updateAttribute(
  tag: { attrs: { name: string; value: string }[] },
  name: string,
  value: string,
): void {
  const index = tag.attrs.findIndex((a) => a.name === name);
  const newValue = { name, value };

  if (index === -1) {
    tag.attrs.push(newValue);
  } else {
    tag.attrs[index] = newValue;
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}
