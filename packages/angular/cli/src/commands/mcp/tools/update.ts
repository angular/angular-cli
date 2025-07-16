/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ApplicationComplexity, RECOMMENDATIONS, type Step } from '../recommendations.js';

interface Option {
  id: keyof Step;
  name: string;
  description: string;
}

interface Version {
  name: string;
  number: number;
}

const optionList: Option[] = [
  { id: 'ngUpgrade', name: 'ngUpgrade', description: 'to combine AngularJS & Angular' },
  { id: 'material', name: 'Angular Material', description: '' },
];

const isWindows = process.platform === 'win32';

const versions: Version[] = [
  { name: '20.0', number: 2000 },
  { name: '19.0', number: 1900 },
  { name: '18.0', number: 1800 },
  { name: '17.0', number: 1700 },
  { name: '16.0', number: 1600 },
  { name: '15.0', number: 1500 },
  { name: '14.0', number: 1400 },
  { name: '13.0', number: 1300 },
  { name: '12.0', number: 1200 },
  { name: '11.0', number: 1100 },
  { name: '10.2', number: 1020 },
  { name: '10.1', number: 1010 },
  { name: '10.0', number: 1000 },
  { name: '9.1', number: 910 },
  { name: '9.0', number: 900 },
  { name: '8.2', number: 820 },
  { name: '8.1', number: 810 },
  { name: '8.0', number: 800 },
  { name: '7.2', number: 720 },
  { name: '7.1', number: 710 },
  { name: '7.0', number: 700 },
  { name: '6.1', number: 610 },
  { name: '6.0', number: 600 },
  { name: '5.2', number: 520 },
  { name: '5.1', number: 510 },
  { name: '5.0', number: 500 },
  { name: '4.4', number: 440 },
  { name: '4.3', number: 430 },
  { name: '4.2', number: 420 },
  { name: '4.1', number: 410 },
  { name: '4.0', number: 400 },
  { name: '2.4', number: 204 },
  { name: '2.3', number: 203 },
  { name: '2.2', number: 202 },
  { name: '2.1', number: 201 },
  { name: '2.0', number: 200 },
];

/**
 * Registers a tool with the MCP server to generate Angular version migration steps.
 *
 * This tool provides migration recommendations for updating from one Angular version to another,
 * based on the official Angular Update Guide recommendations.
 *
 * @param server The MCP server instance with which to register the tool.
 */
export async function registerUpdateTool(server: McpServer): Promise<void> {
  server.registerTool(
    'update_guide',
    {
      title: 'Angular Update Guide',
      description:
        'Generates a list of migration steps to update an Angular application from one version to another.' +
        ' This tool provides the same recommendations as the official Angular Update Guide at angular.dev/update-guide.' +
        ' The steps are organized into before, during, and after categories based on when they should be performed.',
      annotations: {
        readOnlyHint: true,
      },
      inputSchema: {
        fromVersion: z
          .string()
          .describe(
            'The current Angular version to migrate from (e.g., "18.0", "19.0").' +
              ' Must be a valid Angular version.',
          ),
        toVersion: z
          .string()
          .describe(
            'The target Angular version to migrate to (e.g., "19.0", "20.0").' +
              ' Must be a valid Angular version and higher than fromVersion.',
          ),
        complexity: z
          .enum(['basic', 'medium', 'advanced'])
          .optional()
          .default('basic')
          .describe(
            'The complexity level of your application.' +
              ' "basic" for simple apps, "medium" for standard apps, "advanced" for complex apps with custom configurations.',
          ),
        includeAngularMaterial: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether your application uses Angular Material.'),
        includeNgUpgrade: z
          .boolean()
          .optional()
          .default(false)
          .describe('Whether your application uses ngUpgrade (hybrid AngularJS/Angular apps).'),
      },
    },
    async ({
      fromVersion,
      toVersion,
      complexity = 'basic',
      includeAngularMaterial = false,
      includeNgUpgrade = false,
    }) => {
      // Find version objects
      const fromVersionObj = versions.find((v) => v.name === fromVersion);
      const toVersionObj = versions.find((v) => v.name === toVersion);

      if (!fromVersionObj) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Invalid fromVersion "${fromVersion}". Available versions: ${versions.map((v) => v.name).join(', ')}`,
            },
          ],
        };
      }

      if (!toVersionObj) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Invalid toVersion "${toVersion}". Available versions: ${versions.map((v) => v.name).join(', ')}`,
            },
          ],
        };
      }

      // Validate version order
      if (toVersionObj.number <= fromVersionObj.number) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Cannot generate recommendations for downgrading versions. The target version must be higher than the current version.',
            },
          ],
        };
      }

      // Convert complexity string to enum
      const complexityLevel =
        complexity === 'basic'
          ? ApplicationComplexity.Basic
          : complexity === 'medium'
            ? ApplicationComplexity.Medium
            : ApplicationComplexity.Advanced;

      // Set up options
      const options = {
        ngUpgrade: includeNgUpgrade,
        material: includeAngularMaterial,
      };

      // Filter and categorize steps
      const beforeSteps: Step[] = [];
      const duringSteps: Step[] = [];
      const afterSteps: Step[] = [];

      for (const step of RECOMMENDATIONS) {
        if (step.level <= complexityLevel && step.necessaryAsOf > fromVersionObj.number) {
          // Check if step should be skipped based on options
          let skip = false;

          // Check standard options (ngUpgrade, material)
          for (const option of optionList) {
            // Skip steps which require an option not set by the user
            if (step[option.id] && !options[option.id as keyof typeof options]) {
              skip = true;
            }
            // Skip steps which require **not** using an option which **is** set by the user
            if (step[option.id] === false && options[option.id as keyof typeof options]) {
              skip = true;
            }
          }

          // Check windows option separately (automatically detected)
          if (step.windows !== undefined) {
            if (step.windows && !isWindows) {
              skip = true; // Skip Windows-specific steps on non-Windows
            }
            if (step.windows === false && isWindows) {
              skip = true; // Skip non-Windows steps on Windows
            }
          }

          if (skip) {
            continue;
          }

          // Categorize steps based on timing
          if (
            step.possibleIn <= fromVersionObj.number &&
            step.necessaryAsOf >= fromVersionObj.number
          ) {
            beforeSteps.push(step);
          } else if (
            step.possibleIn > fromVersionObj.number &&
            step.necessaryAsOf <= toVersionObj.number
          ) {
            duringSteps.push(step);
          } else if (step.possibleIn <= toVersionObj.number) {
            afterSteps.push(step);
          }
        }
      }

      // Generate markdown output
      let markdown = `# Angular Update Guide: v${fromVersion} → v${toVersion}\n\n`;
      markdown += `**Application complexity:** ${complexity}\n`;
      markdown += `**Options:** ${
        Object.entries(options)
          .filter(([_, value]) => value)
          .map(([key]) => key)
          .join(', ') || 'none'
      }\n\n`;

      if (beforeSteps.length > 0) {
        markdown += `## Before Updating (Optional preparations)\n\n`;
        markdown += `These steps can be performed before the update to prepare your application:\n\n`;
        beforeSteps.forEach((step, index) => {
          markdown += `### ${index + 1}. ${step.step}\n\n`;
          markdown += `${step.action}\n\n`;
        });
      }

      if (duringSteps.length > 0) {
        markdown += `## During Update (Required)\n\n`;
        markdown += `These steps must be performed as part of the update process:\n\n`;
        duringSteps.forEach((step, index) => {
          markdown += `### ${index + 1}. ${step.step}\n\n`;
          markdown += `${step.action}\n\n`;
        });
      }

      if (afterSteps.length > 0) {
        markdown += `## After Update (Follow-up)\n\n`;
        markdown += `These steps should be performed after the main update:\n\n`;
        afterSteps.forEach((step, index) => {
          markdown += `### ${index + 1}. ${step.step}\n\n`;
          markdown += `${step.action}\n\n`;
        });
      }

      if (beforeSteps.length === 0 && duringSteps.length === 0 && afterSteps.length === 0) {
        markdown += `## No Specific Steps Required\n\n`;
        markdown += `Based on your configuration, no specific migration steps are required for updating from v${fromVersion} to v${toVersion}. `;
        markdown += `You can proceed with the standard Angular update process using \`ng update\`.\n\n`;
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: markdown,
          },
        ],
      };
    },
  );
}
