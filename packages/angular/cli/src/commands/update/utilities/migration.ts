/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { SchematicDescription, UnsuccessfulWorkflowExecution } from '@angular-devkit/schematics';
import {
  FileSystemCollectionDescription,
  FileSystemSchematicDescription,
  NodeWorkflow,
} from '@angular-devkit/schematics/tools';
import { SpawnSyncReturns } from 'node:child_process';
import * as semver from 'semver';
import { subscribeToWorkflow } from '../../../command-builder/utilities/schematic-workflow';
import { colors, figures } from '../../../utilities/color';
import { assertIsError } from '../../../utilities/error';
import { writeErrorToLogFile } from '../../../utilities/log-file';
import { askChoices } from '../../../utilities/prompt';
import { isTTY } from '../../../utilities/tty';
import { coerceVersionNumber } from './cli-version';
import { createCommit, findCurrentGitSha, getShortHash, hasChangesToCommit } from './git';

export interface MigrationSchematicDescription extends SchematicDescription<
  FileSystemCollectionDescription,
  FileSystemSchematicDescription
> {
  version?: string;
  optional?: boolean;
  recommended?: boolean;
  documentation?: string;
}

interface MigrationSchematicDescriptionWithVersion extends MigrationSchematicDescription {
  version: string;
}

export async function executeSchematic(
  workflow: NodeWorkflow,
  logger: logging.Logger,
  collection: string,
  schematic: string,
  options: Record<string, unknown> = {},
): Promise<{ success: boolean; files: Set<string> }> {
  const workflowSubscription = subscribeToWorkflow(workflow, logger);

  // TODO: Allow passing a schematic instance directly
  try {
    await workflow
      .execute({
        collection,
        schematic,
        options,
        logger,
      })
      .toPromise();

    return { success: !workflowSubscription.error, files: workflowSubscription.files };
  } catch (e) {
    if (e instanceof UnsuccessfulWorkflowExecution) {
      logger.error(`${figures.cross} Migration failed. See above for further details.\n`);
    } else {
      assertIsError(e);
      const logPath = writeErrorToLogFile(e);
      logger.fatal(
        `${figures.cross} Migration failed: ${e.message}\n` +
          `  See "${logPath}" for further details.\n`,
      );
    }

    return { success: false, files: workflowSubscription.files };
  } finally {
    workflowSubscription.unsubscribe();
  }
}

/**
 * @return Whether or not the migration was performed successfully.
 */
export async function executeMigration(
  workflow: NodeWorkflow,
  logger: logging.Logger,
  packageName: string,
  collectionPath: string,
  migrationName: string,
  commit: boolean = false,
): Promise<number> {
  const collection = workflow.engine.createCollection(collectionPath);
  const name = collection.listSchematicNames().find((name) => name === migrationName);
  if (!name) {
    logger.error(`Cannot find migration '${migrationName}' in '${packageName}'.`);

    return 1;
  }

  logger.info(colors.cyan(`** Executing '${migrationName}' of package '${packageName}' **\n`));
  const schematic = workflow.engine.createSchematic(name, collection);

  return executePackageMigrations(
    workflow,
    logger,
    [schematic.description as MigrationSchematicDescription],
    packageName,
    commit,
  );
}

/**
 * @return Whether or not the migrations were performed successfully.
 */
export async function executeMigrations(
  workflow: NodeWorkflow,
  logger: logging.Logger,
  packageName: string,
  collectionPath: string,
  from: string,
  to: string,
  commit: boolean = false,
): Promise<number> {
  const collection = workflow.engine.createCollection(collectionPath);
  const migrationRange = new semver.Range(
    '>' + (semver.prerelease(from) ? from.split('-')[0] + '-0' : from) + ' <=' + to.split('-')[0],
  );

  const requiredMigrations: MigrationSchematicDescriptionWithVersion[] = [];
  const optionalMigrations: MigrationSchematicDescriptionWithVersion[] = [];

  for (const name of collection.listSchematicNames()) {
    const schematic = workflow.engine.createSchematic(name, collection);
    const description = schematic.description as MigrationSchematicDescription;

    description.version = coerceVersionNumber(description.version);
    if (!description.version) {
      continue;
    }

    if (semver.satisfies(description.version, migrationRange, { includePrerelease: true })) {
      (description.optional ? optionalMigrations : requiredMigrations).push(
        description as MigrationSchematicDescriptionWithVersion,
      );
    }
  }

  if (requiredMigrations.length === 0 && optionalMigrations.length === 0) {
    return 0;
  }

  // Required migrations
  if (requiredMigrations.length) {
    logger.info(colors.cyan(`** Executing migrations of package '${packageName}' **\n`));

    requiredMigrations.sort(
      (a, b) => semver.compare(a.version, b.version) || a.name.localeCompare(b.name),
    );

    const result = await executePackageMigrations(
      workflow,
      logger,
      requiredMigrations,
      packageName,
      commit,
    );

    if (result === 1) {
      return 1;
    }
  }

  // Optional migrations
  if (optionalMigrations.length) {
    logger.info(colors.magenta(`** Optional migrations of package '${packageName}' **\n`));

    optionalMigrations.sort(
      (a, b) => semver.compare(a.version, b.version) || a.name.localeCompare(b.name),
    );

    const migrationsToRun = await getOptionalMigrationsToRun(
      logger,
      optionalMigrations,
      packageName,
    );

    if (migrationsToRun?.length) {
      return executePackageMigrations(workflow, logger, migrationsToRun, packageName, commit);
    }
  }

  return 0;
}

async function executePackageMigrations(
  workflow: NodeWorkflow,
  logger: logging.Logger,
  migrations: MigrationSchematicDescription[],
  packageName: string,
  commit = false,
): Promise<1 | 0> {
  for (const migration of migrations) {
    const { title, description } = getMigrationTitleAndDescription(migration);

    logger.info(colors.cyan(figures.pointer) + ' ' + colors.bold(title));

    if (description) {
      logger.info('  ' + description);
    }

    const { success, files } = await executeSchematic(
      workflow,
      logger,
      migration.collection.name,
      migration.name,
    );
    if (!success) {
      return 1;
    }

    let modifiedFilesText: string;
    switch (files.size) {
      case 0:
        modifiedFilesText = 'No changes made';
        break;
      case 1:
        modifiedFilesText = '1 file modified';
        break;
      default:
        modifiedFilesText = `${files.size} files modified`;
        break;
    }

    logger.info(`  Migration completed (${modifiedFilesText}).`);

    // Commit migration
    if (commit) {
      const commitPrefix = `${packageName} migration - ${migration.name}`;
      const commitMessage = migration.description
        ? `${commitPrefix}\n\n${migration.description}`
        : commitPrefix;
      const committed = commitChanges(logger, commitMessage);
      if (!committed) {
        // Failed to commit, something went wrong. Abort the update.
        return 1;
      }
    }

    logger.info(''); // Extra trailing newline.
  }

  return 0;
}

/**
 * @return Whether or not the commit was successful.
 */
export function commitChanges(logger: logging.Logger, message: string): boolean {
  // Check if a commit is needed.
  let commitNeeded: boolean;
  try {
    commitNeeded = hasChangesToCommit();
  } catch (err) {
    logger.error(`  Failed to read Git tree:\n${(err as SpawnSyncReturns<string>).stderr}`);

    return false;
  }

  if (!commitNeeded) {
    logger.info('  No changes to commit after migration.');

    return true;
  }

  // Commit changes and abort on error.
  try {
    createCommit(message);
  } catch (err) {
    logger.error(
      `Failed to commit update (${message}):\n${(err as SpawnSyncReturns<string>).stderr}`,
    );

    return false;
  }

  // Notify user of the commit.
  const hash = findCurrentGitSha();
  const shortMessage = message.split('\n')[0];
  if (hash) {
    logger.info(`  Committed migration step (${getShortHash(hash)}): ${shortMessage}.`);
  } else {
    // Commit was successful, but reading the hash was not. Something weird happened,
    // but nothing that would stop the update. Just log the weirdness and continue.
    logger.info(`  Committed migration step: ${shortMessage}.`);
    logger.warn('  Failed to look up hash of most recent commit, continuing anyways.');
  }

  return true;
}

async function getOptionalMigrationsToRun(
  logger: logging.Logger,
  optionalMigrations: MigrationSchematicDescription[],
  packageName: string,
): Promise<MigrationSchematicDescription[] | undefined> {
  const numberOfMigrations = optionalMigrations.length;
  logger.info(
    `This package has ${numberOfMigrations} optional migration${
      numberOfMigrations > 1 ? 's' : ''
    } that can be executed.`,
  );

  if (!isTTY()) {
    for (const migration of optionalMigrations) {
      const { title } = getMigrationTitleAndDescription(migration);
      logger.info(colors.cyan(figures.pointer) + ' ' + colors.bold(title));
      logger.info(colors.gray(`  ng update ${packageName} --name ${migration.name}`));
      logger.info(''); // Extra trailing newline.
    }

    return undefined;
  }

  logger.info(
    'Optional migrations may be skipped and executed after the update process, if preferred.',
  );
  logger.info(''); // Extra trailing newline.

  const answer = await askChoices(
    `Select the migrations that you'd like to run`,
    optionalMigrations.map((migration) => {
      const { title, documentation } = getMigrationTitleAndDescription(migration);

      return {
        name: `[${colors.white(migration.name)}] ${title}${documentation ? ` (${documentation})` : ''}`,
        value: migration.name,
        checked: migration.recommended,
      };
    }),
    null,
  );

  logger.info(''); // Extra trailing newline.

  return optionalMigrations.filter(({ name }) => answer?.includes(name));
}

function getMigrationTitleAndDescription(migration: MigrationSchematicDescription): {
  title: string;
  description: string;
  documentation?: string;
} {
  const [title, ...description] = migration.description.split('. ');

  return {
    title: title.endsWith('.') ? title : title + '.',
    description: description.join('.\n  '),
    documentation: migration.documentation
      ? new URL(migration.documentation, 'https://angular.dev').href
      : undefined,
  };
}
