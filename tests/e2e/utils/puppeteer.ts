import { type Page, launch } from 'puppeteer';
import { execAndWaitForOutputToMatch, killAllProcesses } from './process';
import { stripVTControlCharacters } from 'node:util';

export interface BrowserTestOptions {
  project?: string;
  configuration?: string;
  baseUrl?: string;
  checkFn?: (page: Page) => Promise<void>;
  expectedTitleText?: string;
}

export async function executeBrowserTest(options: BrowserTestOptions = {}) {
  let url = options.baseUrl;
  let hasStartedServer = false;

  try {
    if (!url) {
      // Start serving and find address (1 - Webpack; 2 - Vite)
      const match = /(?:open your browser on|Local:)\s+(http:\/\/localhost:\d+\/)/;
      const serveArgs = ['serve', '--port=0'];
      if (options.project) {
        serveArgs.push(options.project);
      }
      if (options.configuration) {
        serveArgs.push(`--configuration=${options.configuration}`);
      }

      const { stdout } = await execAndWaitForOutputToMatch('ng', serveArgs, match, {
        ...process.env,
        'NO_COLOR': '1',
      });
      url = stripVTControlCharacters(stdout).match(match)?.[1];
      if (!url) {
        throw new Error('Could not find serving URL');
      }
      hasStartedServer = true;
    }

    const browser = await launch({
      executablePath: process.env['CHROME_BIN'],
      headless: true,
      args: ['--no-sandbox'],
    });
    try {
      const page = await browser.newPage();

      // Capture errors
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      page.on('pageerror', (err) => {
        errors.push(err.toString());
      });

      await page.goto(url);

      if (options.checkFn) {
        await options.checkFn(page);
      } else {
        // Default check: verify h1 content and no browser errors
        const expectedText = options.expectedTitleText || 'Hello, test-project';

        // Wait for the h1 element to appear and contain the expected text
        await page.waitForFunction(
          (selector: string, text: string) => {
            const doc = (globalThis as any).document;
            return doc.querySelector(selector)?.textContent?.includes(text);
          },
          { timeout: 10000 }, // Max 10 seconds wait time
          'h1',
          expectedText,
        );
      }

      if (errors.length > 0) {
        throw new Error(`Browser console errors detected:\n${errors.join('\n')}`);
      }
    } finally {
      await browser.close();
    }
  } finally {
    if (hasStartedServer) {
      await killAllProcesses();
    }
  }
}
