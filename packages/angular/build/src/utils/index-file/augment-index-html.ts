/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createHash } from 'node:crypto';
import { extname } from 'node:path';
import { loadEsmModule } from '../load-esm';
import { htmlRewritingStream } from './html-rewriting-stream';
import { VALID_SELF_CLOSING_TAGS } from './valid-self-closing-tags';

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
  hints?: { url: string; mode: string; as?: string }[];
  imageDomains?: string[];
}

export interface FileInfo {
  file: string;
  name?: string;
  extension: string;
}

/*
 * Helper function used by the IndexHtmlWebpackPlugin.
 * Can also be directly used by builder, e. g. in order to generate an index.html
 * after processing several configurations in order to build different sets of
 * bundles for differential serving.
 */
// eslint-disable-next-line max-lines-per-function
export async function augmentIndexHtml(
  params: AugmentIndexHtmlOptions,
): Promise<{ content: string; warnings: string[]; errors: string[] }> {
  const {
    loadOutputFile,
    files,
    entrypoints,
    sri,
    deployUrl = '',
    lang,
    baseHref,
    html,
    imageDomains,
  } = params;

  const warnings: string[] = [];
  const errors: string[] = [];

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
        case '.mjs':
          if (!isModule) {
            // It would be very confusing to link an `*.mjs` file in a non-module script context,
            // so we disallow it entirely.
            throw new Error('`.mjs` files *must* set `isModule` to `true`.');
          }
          scripts.set(file, true /* isModule */);
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

  let headerLinkTags: string[] = [];
  let bodyLinkTags: string[] = [];
  for (const src of stylesheets) {
    const attrs = [`rel="stylesheet"`, `href="${deployUrl}${src}"`];

    if (crossOrigin !== 'none') {
      attrs.push(`crossorigin="${crossOrigin}"`);
    }

    if (sri) {
      const content = await loadOutputFile(src);
      attrs.push(generateSriAttributes(content));
    }

    headerLinkTags.push(`<link ${attrs.join(' ')}>`);
  }

  if (params.hints?.length) {
    for (const hint of params.hints) {
      const attrs = [`rel="${hint.mode}"`, `href="${deployUrl}${hint.url}"`];

      if (hint.mode !== 'modulepreload' && crossOrigin !== 'none') {
        // Value is considered anonymous by the browser when not present or empty
        attrs.push(crossOrigin === 'anonymous' ? 'crossorigin' : `crossorigin="${crossOrigin}"`);
      }

      if (hint.mode === 'preload' || hint.mode === 'prefetch') {
        switch (extname(hint.url)) {
          case '.js':
            attrs.push('as="script"');
            break;
          case '.css':
            attrs.push('as="style"');
            break;
          default:
            if (hint.as) {
              attrs.push(`as="${hint.as}"`);
            }
            break;
        }
      }

      if (
        sri &&
        (hint.mode === 'preload' || hint.mode === 'prefetch' || hint.mode === 'modulepreload')
      ) {
        const content = await loadOutputFile(hint.url);
        attrs.push(generateSriAttributes(content));
      }

      const tag = `<link ${attrs.join(' ')}>`;
      if (hint.mode === 'modulepreload') {
        // Module preloads should be placed by the inserted script elements in the body since
        // they are only useful in combination with the scripts.
        bodyLinkTags.push(tag);
      } else {
        headerLinkTags.push(tag);
      }
    }
  }

  const dir = lang ? await getLanguageDirection(lang, warnings) : undefined;
  const { rewriter, transformedContent } = await htmlRewritingStream(html);
  const baseTagExists = html.includes('<base');
  const foundPreconnects = new Set<string>();

  rewriter
    .on('startTag', (tag, rawTagHtml) => {
      switch (tag.tagName) {
        case 'html':
          // Adjust document locale if specified
          if (isString(lang)) {
            updateAttribute(tag, 'lang', lang);
          }

          if (dir) {
            updateAttribute(tag, 'dir', dir);
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
        case 'link':
          if (readAttribute(tag, 'rel') === 'preconnect') {
            const href = readAttribute(tag, 'href');
            if (href) {
              foundPreconnects.add(href);
            }
          }
          break;
        default:
          if (tag.selfClosing && !VALID_SELF_CLOSING_TAGS.has(tag.tagName)) {
            errors.push(`Invalid self-closing element in index HTML file: '${rawTagHtml}'.`);

            return;
          }
      }

      rewriter.emitStartTag(tag);
    })
    .on('endTag', (tag) => {
      switch (tag.tagName) {
        case 'head':
          for (const linkTag of headerLinkTags) {
            rewriter.emitRaw(linkTag);
          }
          if (imageDomains) {
            for (const imageDomain of imageDomains) {
              if (!foundPreconnects.has(imageDomain)) {
                rewriter.emitRaw(`<link rel="preconnect" href="${imageDomain}" data-ngimg>`);
              }
            }
          }
          headerLinkTags = [];
          break;
        case 'body':
          for (const linkTag of bodyLinkTags) {
            rewriter.emitRaw(linkTag);
          }
          bodyLinkTags = [];

          // Add script tags
          for (const scriptTag of scriptTags) {
            rewriter.emitRaw(scriptTag);
          }

          scriptTags = [];
          break;
      }

      rewriter.emitEndTag(tag);
    });

  const content = await transformedContent();

  return {
    content:
      headerLinkTags.length || scriptTags.length
        ? // In case no body/head tags are not present (dotnet partial templates)
          headerLinkTags.join('') + scriptTags.join('') + content
        : content,
    warnings,
    errors,
  };
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

function readAttribute(
  tag: { attrs: { name: string; value: string }[] },
  name: string,
): string | undefined {
  const targetAttr = tag.attrs.find((attr) => attr.name === name);

  return targetAttr ? targetAttr.value : undefined;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

async function getLanguageDirection(
  locale: string,
  warnings: string[],
): Promise<string | undefined> {
  const dir = await getLanguageDirectionFromLocales(locale);

  if (!dir) {
    warnings.push(
      `Locale data for '${locale}' cannot be found. 'dir' attribute will not be set for this locale.`,
    );
  }

  return dir;
}

async function getLanguageDirectionFromLocales(locale: string): Promise<string | undefined> {
  try {
    const localeData = (
      await loadEsmModule<typeof import('@angular/common/locales/en')>(
        `@angular/common/locales/${locale}`,
      )
    ).default;

    const dir = localeData[localeData.length - 2];

    return isString(dir) ? dir : undefined;
  } catch {
    // In some cases certain locales might map to files which are named only with language id.
    // Example: `en-US` -> `en`.
    const [languageId] = locale.split('-', 1);
    if (languageId !== locale) {
      return getLanguageDirectionFromLocales(languageId);
    }
  }

  return undefined;
}
