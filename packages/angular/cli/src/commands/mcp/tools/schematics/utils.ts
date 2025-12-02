/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { McpToolContext } from '../tool-registry';
import type {
  CollectionJson,
  InferenceResult,
  ResolutionInfo,
  SchemaShape,
  SchematicMeta,
  SchematicMetaOption,
} from './types';

// In-memory cache with TTL + mtime validation.
const SCHEMATICS_CACHE = new Map<
  string,
  {
    meta: SchematicMeta[];
    modifiedTimeMs: number;
    cachedAt: number;
  }
>();

const SCHEMATICS_CACHE_TTL_MS = 30_000; // 30s TTL

export function toKebabCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export async function inferRequiredOptions(
  found: SchematicMeta,
  angularRoot: string,
  prompt: string | undefined,
  original: Record<string, unknown>,
): Promise<InferenceResult> {
  const working = { ...original };
  const hints: string[] = [];
  const nameCandidates: string[] = [];
  if (!found.options || !found.options.length) {
    return { options: working, hints, missingAfter: [], nameCandidates };
  }
  const requiredNames = found.options.filter((o) => o.required).map((o) => o.name);
  const missing = requiredNames.filter(
    (r) => !(r in working) || working[r] === undefined || working[r] === '',
  );
  if (missing.length) {
    if (missing.includes('project')) {
      try {
        const angularJsonRaw = await readFile(join(angularRoot, 'angular.json'), 'utf-8');
        const angularConfig = JSON.parse(angularJsonRaw) as {
          defaultProject?: string;
          projects?: Record<string, { projectType?: string }>;
        };
        let inferred = angularConfig.defaultProject;
        if (!inferred && angularConfig.projects) {
          inferred = Object.entries(angularConfig.projects).find(
            ([, _v]) => _v.projectType === 'application',
          )?.[0];
          if (!inferred) {
            inferred = Object.keys(angularConfig.projects)[0];
          }
        }
        if (
          !inferred &&
          angularConfig.projects &&
          Object.keys(angularConfig.projects).length === 1
        ) {
          inferred = Object.keys(angularConfig.projects)[0];
        }
        if (inferred) {
          working['project'] = inferred;
          hints.push(`Inferred required option 'project' = '${inferred}'`);
        }
      } catch {
        // ignore
      }
    }
    if (missing.includes('name')) {
      let rawName: string | undefined;
      if (prompt) {
        rawName = extractNameFromPrompt(prompt, found.name);
      }
      const candidates = buildNameCandidates(rawName, found.name);
      nameCandidates.push(...candidates);
      if (candidates.length) {
        const chosen = toKebabCase(candidates[0]) || candidates[0];
        working['name'] = chosen;
        hints.push(
          `Inferred required option 'name' primary='${working['name']}' candidates=[${candidates.join(', ')}]`,
        );
      }
    }
    if (missing.includes('path') && prompt) {
      const extractedPath = extractPathFromPrompt(prompt);
      if (extractedPath) {
        working['path'] = extractedPath;
        hints.push(`Inferred option 'path' = '${extractedPath}' from natural language prompt`);
      }
    }
  }
  const stillMissing = requiredNames.filter(
    (r) => !(r in working) || working[r] === undefined || working[r] === '',
  );

  return { options: working, hints, missingAfter: stillMissing, nameCandidates };
}

export function buildAlternativeCommandPreviews(
  schematicName: string,
  baseOptions: Record<string, unknown>,
  nameCandidates: string[],
): string[] {
  if (!nameCandidates.length) {
    return [];
  }
  const previews: string[] = [];
  for (const candidate of nameCandidates.slice(0, 6)) {
    const opts = { ...baseOptions, name: toKebabCase(candidate) || candidate };
    const args = Object.entries(opts)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .map(
        ([k, v]) => `--${k}=${Array.isArray(v) || typeof v === 'object' ? JSON.stringify(v) : v}`,
      );
    previews.push(`ng generate @schematics/angular:${schematicName} ${args.join(' ')}`.trim());
  }

  return [...new Set(previews)];
}

/**
 * Returns the Angular docs URL for a schematic.
 */
export function getSchematicDocLink(schematicName: string): string {
  return `https://angular.dev/cli/generate/${schematicName}`;
}

/**
 * Emits hints for option keys that are converted to kebab-case (for CLI compatibility).
 */
export function emitKebabCaseHints(options: Record<string, unknown>): string[] {
  const hints: string[] = [];
  for (const k of Object.keys(options)) {
    if (options[k] === undefined || options[k] === null) {
      continue;
    }
    const kebab = toKebabCase(k);
    if (k !== kebab) {
      hints.push(`Option '${k}' emitted as '--${kebab}'`);
    }
  }

  return hints;
}

export async function loadSchematicsMetadata(
  workspacePath: string,
  logger: McpToolContext['logger'],
  loader?: () => Promise<{ meta: SchematicMeta[] }>,
): Promise<{ meta: SchematicMeta[] }> {
  // If a loader is provided (e.g. in tests), use it
  if (loader) {
    return loader();
  }
  // Fallback to real file resolution if no mock is present
  const info = resolveCollection(workspacePath);
  if (!info.resolved) {
    logger.warn(
      `Could not resolve '@schematics/angular/collection.json' from '${workspacePath}'. Error: ${info.error}`,
    );

    return Promise.resolve({ meta: [] });
  }
  logger.warn(
    'Schematics collection path: ' + info.resolved + (info.fallback ? ' (fallback)' : ''),
  );
  const collectionPath = info.resolved;
  try {
    const fileStat = await stat(collectionPath);
    const now = Date.now();
    const cached = SCHEMATICS_CACHE.get(collectionPath);
    if (
      cached &&
      cached.modifiedTimeMs === fileStat.mtimeMs &&
      now - cached.cachedAt < SCHEMATICS_CACHE_TTL_MS &&
      !info.fallback
    ) {
      return Promise.resolve({ meta: cached.meta });
    }
  } catch {
    // ignore stat errors
  }
  const content = await readFile(collectionPath, 'utf-8');
  const json: CollectionJson = JSON.parse(content);
  const baseDir = dirname(collectionPath);
  const meta: SchematicMeta[] = [];
  for (const [name, entry] of Object.entries(json.schematics)) {
    const schematicMeta: SchematicMeta = {
      name,
      aliases: entry.aliases,
      description: entry.description,
      hidden: entry.hidden,
      private: entry.private,
    };
    if (entry.schema) {
      try {
        const schemaStr = await readFile(join(baseDir, entry.schema), 'utf-8');
        const schemaJson: SchemaShape = JSON.parse(schemaStr);
        schematicMeta.required = Array.isArray(schemaJson.required) ? schemaJson.required : [];
        const props = schemaJson.properties || {};
        schematicMeta.options = Object.entries(props).map(([propName, def]) => {
          const record = def as Record<string, unknown>;
          const promptVal = record['x-prompt'];

          return {
            name: propName,
            description: record.description as string | undefined,
            type: record.type as string | string[] | undefined,
            enum: record.enum as unknown[] | undefined,
            default: record.default,
            required: schematicMeta.required?.includes(propName),
            alias: record.alias as string | undefined,
            oneOf: record.oneOf as unknown[] | undefined,
            prompt:
              typeof promptVal === 'string'
                ? promptVal
                : typeof promptVal === 'object' && promptVal !== null
                  ? JSON.stringify(promptVal)
                  : undefined,
          } as SchematicMetaOption;
        });
      } catch {
        // ignore schema read errors
      }
    }
    meta.push(schematicMeta);
  }
  try {
    const fileStat = await stat(collectionPath);
    SCHEMATICS_CACHE.set(collectionPath, {
      meta,
      modifiedTimeMs: fileStat.mtimeMs,
      cachedAt: Date.now(),
    });
  } catch {
    // ignore stat errors
  }

  return Promise.resolve({ meta });
}

function truncateAtConnectors(text: string): string {
  const stopPattern =
    /(\busing\b|\bwith\b|\bthat\b|\bwhich\b|\bin\b|\bat\b|\bunder\b|\binside\b|\bwithin\b|\bwhen\b|\bwhile\b)/i;
  const parts = text.split(stopPattern);

  return parts.length > 1 ? parts[0].trim() : text.trim();
}

function extractPathFromPrompt(prompt: string): string | undefined {
  const directPatterns = [
    /\b(?:at|in|into|under|inside|within)\s+(["'])([^"']+)\1/gi,
    /\b(?:at|in|into|under|inside|within)\s+([^.,;]+)/gi,
  ];
  for (const pattern of directPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(prompt)) !== null) {
      const raw = match[2] ?? match[1];
      if (!raw) {
        continue;
      }
      const truncated = truncateAtConnectors(raw)
        .split(/\b(for|to|from|so|and|but|because)\b/i)[0]
        .trim();
      let candidate = truncated
        .replace(/\b(folder|directory|subdirectory|sub-folder)\b/gi, ' ')
        .replace(/\b(the|this|that|a|an)\b/gi, ' ')
        .replace(/["']/g, ' ')
        .replace(/\s*(?:\/|\\)\s*/g, '/')
        .trim();

      if (!candidate) {
        continue;
      }
      if (candidate.includes('/')) {
        candidate = candidate
          .split('/')
          .map((segment) => segment.trim().replace(/\s+/g, '-'))
          .filter((segment) => segment.length > 0)
          .join('/');
      } else {
        candidate = candidate.replace(/\s+/g, '-');
      }
      candidate = candidate
        .replace(/-{2,}/g, '-')
        .replace(/\/-{1,}/g, '/')
        .replace(/-{1,}\//g, '/')
        .replace(/\/{2,}/g, '/')
        .replace(/^\//, '')
        .replace(/\/$/, '');
      if (!candidate.length) {
        continue;
      }

      return candidate;
    }
  }

  return undefined;
}

function extractNameFromPrompt(prompt: string, schematicType: string): string | undefined {
  const calledMatch = prompt.match(/\b(called|named)\s+([A-Za-z][\w-]*)/i);
  if (calledMatch) {
    return calledMatch[2];
  }
  const typeNamedPattern = new RegExp(
    `\\b${schematicType}\\b\\s+(?:called|named)\\s+([A-Za-z][A-Za-z0-9_-]*)`,
    'i',
  );
  const typeNamedMatch = prompt.match(typeNamedPattern);
  if (typeNamedMatch) {
    return typeNamedMatch[1];
  }
  const typeLeadingPattern = new RegExp(
    `\\b${schematicType}\\b[^A-Za-z0-9]+([A-Za-z][A-Za-z0-9_-]*)`,
    'i',
  );
  const typeLeadingMatch = prompt.match(typeLeadingPattern);
  if (typeLeadingMatch) {
    return typeLeadingMatch[1];
  }
  const descriptivePattern = new RegExp(
    `\\b${schematicType}\\b\\s+(?:for|to|about)\\s+([^.,;]+)`,
    'i',
  );
  const descriptiveMatch = prompt.match(descriptivePattern);
  if (descriptiveMatch) {
    const truncated = truncateAtConnectors(descriptiveMatch[1]);
    const cleaned = truncated
      .replace(/\b(the|a|an|new|component|enum|service|pipe|directive|module|class|file)\b/gi, ' ')
      .trim();
    if (cleaned) {
      const tokens = cleaned
        .split(/[\s_-]+/)
        .filter((segment) => segment.length > 0)
        .slice(0, 6);
      if (tokens.length) {
        return tokens
          .map((segment, index) =>
            index === 0 ? segment : segment.charAt(0).toUpperCase() + segment.slice(1),
          )
          .join('');
      }
    }
  }

  return undefined;
}

function buildNameCandidates(raw: string | undefined, _schematicType: string): string[] {
  const base = raw?.trim();
  const candidates: string[] = [];
  if (base) {
    const noSpaces = base.replace(/\s+/g, '-');
    candidates.push(base);
    candidates.push(noSpaces);
    const kebab = toKebabCase(base);
    candidates.push(kebab);
    // PascalCase & camelCase versions (from tokens)
    const parts = base
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length) {
      const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
      const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
      candidates.push(pascal);
      candidates.push(camel);
    }
  }
  // No generic fallback names: if prompt gives nothing we return empty list so caller can surface a missing required option.
  // Deduplicate preserving order & remove empties.

  return [...new Set(candidates.filter((c) => c && c.length))].slice(0, 8);
}

function resolveCollection(workspacePath: string): ResolutionInfo {
  const baseDir = workspacePath.endsWith('.json') ? dirname(workspacePath) : workspacePath;
  const candidatePackageJson = join(baseDir, 'package.json');
  const anchors: string[] = [];
  if (candidatePackageJson) {
    anchors.push(candidatePackageJson);
  }
  anchors.push(join(baseDir, 'angular.json'));
  anchors.push(join(baseDir, 'index.mcp-anchor.js'));
  for (const anchor of anchors) {
    try {
      const req = createRequire(anchor);
      try {
        const direct = req.resolve('@schematics/angular/collection.json');

        return { resolved: direct, candidateDir: baseDir, strategy: 'direct', anchor };
      } catch {
        const pkgRoot = req.resolve('@schematics/angular/package.json');
        const rootDir = dirname(pkgRoot);

        return {
          resolved: join(rootDir, 'collection.json'),
          candidateDir: baseDir,
          strategy: 'pkg-root',
          anchor,
        };
      }
    } catch {
      // continue
    }
  }
  try {
    const globalPkg = require.resolve('@schematics/angular/package.json');
    const globalRoot = dirname(globalPkg);

    return {
      resolved: join(globalRoot, 'collection.json'),
      candidateDir: baseDir,
      fallback: true,
      strategy: 'global-pkg-root',
      error: 'Local resolution failed with all anchors.',
    };
  } catch (e) {
    return { error: (e as Error).message, candidateDir: baseDir, strategy: 'failed' };
  }
}
