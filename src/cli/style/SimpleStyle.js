/*
 * Copyright (C) 2017 Alasdair Mercer, !ninja
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

const chalk = require('chalk');
const { EOL } = require('os');
const path = require('path');
const stripAnsi = require('strip-ansi');
const table = require('text-table');

const Style = require('./Style');

/**
 * An implementation of {@link Style} that is intended to be really simple to read. Each search result is printed on its
 * own line and contains the match location, relative file name, and the match highlighted within its own line.
 *
 * @public
 */
class SimpleStyle extends Style {

  /**
   * @inheritdoc
   * @override
   */
  getName() {
    return 'simple';
  }

  /**
   * @inheritdoc
   * @override
   */
  render(results, options) {
    const count = results.length;
    if (!count) {
      return '';
    }

    const output = table(
      results.map((result) => {
        let line = chalk.dim(result.line.substring(0, result.columnNumber));
        line += chalk.bgYellow(chalk.black(result.match));
        line += chalk.dim(result.line.substring(result.columnNumber + result.match.length));

        return [
          `${result.lineNumber}:${result.columnNumber}`,
          `${chalk.blue(path.relative(options.cli.baseDir, options.filePath))}`,
          line
        ];
      }),
      {
        align: [ 'r', 'l' ],
        stringLength(str) {
          return stripAnsi(str).length;
        }
      }
    ).replace(/\r\n?|\n/g, EOL);

    return `${output}${EOL}`;
  }

}

Style.addStyle(SimpleStyle);

module.exports = SimpleStyle;
