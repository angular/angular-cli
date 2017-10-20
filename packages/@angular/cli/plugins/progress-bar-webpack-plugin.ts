import * as progress from 'progress';
import * as webpack from 'webpack';
import * as chalk from 'chalk';

const messageTemplate = [':bar', chalk.green(':percent'), ':msg'].join(' ');
const progressBar = new progress(messageTemplate, {
  complete: chalk.bgGreen(' '),
  incomplete: chalk.bgWhite(' '),
  width: 40,
  total: 100,
  clear: false
});

export class ProgressBarWebpackPlugin extends webpack.ProgressPlugin {
  constructor(options: any = {}) {
    const copy = {...options};

    options.handler = (percent: number, msg: string) => {
      progressBar.update(percent, { msg });

      if (options.handler) {
        options.handler(options);
      }
    };

    super(copy);
  }
}
