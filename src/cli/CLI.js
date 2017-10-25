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

// TODO: complete

const { Command } = require('commander');
const d = require('debug');
const debug = d('searcherer:cli');
const { EOL } = require('os');
const getStdin = require('get-stdin').buffer;
const glob = require('glob');
const iconv = require('iconv-lite');
const util = require('util');

const pkg = require('../../package.json');
const Searcherer = require('..');
const Style = require('./style');

const findFiles = util.promisify(glob);

const _command = Symbol('command');
const _errorStream = Symbol('errorStream');
const _inputStream = Symbol('inputStream');
const _outputStream = Symbol('outputStream');
const _searchBuffer = Symbol('searchBuffer');
const _searchFiles = Symbol('searchFiles');
const _searchValue = Symbol('searchValue');

/**
 * The command-line interface for {@link Searcherer}.
 *
 * While technically part of the API, this is not expected to be used outside of this package as it's only intended use
 * is by <code>bin/searcherer</code>.
 *
 * @public
 */
class CLI {

  /**
   * Creates an instance of {@link CLI} using the <code>options</code> provided.
   *
   * <code>options</code> is primarily intended for testing purposes and it's not expected to be supplied in any
   * real-world scenario.
   *
   * @param {CLI~Options} [options] - the options to be used
   * @public
   */
  constructor(options = {}) {
    this[_errorStream] = options.errorStream || process.stderr;
    this[_inputStream] = options.inputStream || process.stdin;
    this[_outputStream] = options.outputStream || process.stdout;
    this[_command] = new Command()
      .version(pkg.version)
      .usage('[options] [files...]')
      .option('--no-color', 'disables color output')
      .option('-c, --case-sensitive', 'enable case-sensitive search')
      .option('-d, --debug', 'enable debug level logging')
      .option('-e, --encoding <encoding>', 'specify encoding for input [utf8]')
      .option('-f, --filename <filename>', 'specify filename to process STDIN as [<text>]')
      .option('-p, --pattern <pattern>', 'search for pattern')
      .option('-s, --style <name>', 'specify style for output [default]')
      .on('option:debug', () => d.enable('searcherer*'));
  }

  /**
   * TODO: document
   *
   * @param {string} message -
   * @return {void}
   * @public
   */
  error(message) {
    this[_errorStream].write(`${message}${EOL}`);
  }

  /**
   * Parses the command-line (process) arguments provided and performs the necessary actions based on the parsed input.
   *
   * @param {string[]} [args] - the arguments to be parsed
   * @return {Promise.<void, Error>}
   * @public
   */
  async parse(args = []) {
    debug('Parsing arguments: %o', args);

    const command = this[_command].parse(args);
    const options = {
      caseSensitive: Boolean(command.caseSensitive),
      encoding: command.encoding || 'utf8',
      fileName: command.filename || '<text>'
    };

    if (command.pattern != null) {
      options.patterns = Array.isArray(command.pattern) ? command.pattern : [ command.pattern ];
    } else {
      options.patterns = [];
    }

    if (command.style) {
      options.style = Style.find(command.style);
      if (!options.style) {
        throw new Error(`Invalid style: ${command.style}`);
      }
    } else {
      options.style = Style.getDefault();
    }

    debug('Processing arguments: %j', command.args);

    if (command.args.length) {
      const filePaths = [];

      for (const arg of command.args) {
        const files = await findFiles(arg, {
          absolute: true,
          nodir: true
        });

        filePaths.push(...files);
      }

      debug('Searching files: %o', filePaths);

      await this[_searchFiles](filePaths, options);
    } else {
      const buffer = await getStdin();

      debug('Searching STDIN');

      await this[_searchBuffer](buffer, options, options.fileName);
    }
  }

  [_searchBuffer](buffer, options, filePath) {
    this[_searchValue](iconv.decode(buffer, options.encoding), options, filePath);
  }

  async [_searchFiles](filePaths, options) {
    const searcherer = new Searcherer();
    searcherer.register(options.patterns);

    for (const filePath of filePaths) {
      const results = await searcherer.searchFile(filePath, {
        caseSensitive: options.caseSensitive,
        encoding: options.encoding
      });

      this[_outputStream].write(options.style.render(results, { filePath }));
    }
  }

  [_searchValue](value, options, filePath) {
    const searcherer = new Searcherer();
    searcherer.register(options.patterns);

    const results = searcherer.search(value, { caseSensitive: options.caseSensitive });

    this[_outputStream].write(options.style.render(results, { filePath }));
  }

}

module.exports = CLI;

/**
 * The options that can be passed to the {@link CLI} constructor.
 *
 * @typedef {Object} CLI~Options
 * @property {Writable} [errorStream=process.stderr] - The stream for error messages to be written to.
 * @property {Readable} [inputStream=process.stdin] - The stream for input to be read from.
 * @property {Writable} [outputStream=process.stdout] - The stream for output messages to be written to.
 */
