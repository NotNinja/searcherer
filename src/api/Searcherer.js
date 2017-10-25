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

const chalk = require('chalk');
const debug = require('debug')('searcherer:api');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const pluralize = require('pluralize');
const util = require('util');

const Dictionary = require('./Dictionary');

const readFile = util.promisify(fs.readFile);

const _dictionaries = Symbol('dictionaries');
const _searchLine = Symbol('searchLine');
const _searchWithDictionary = Symbol('searchWithDictionary');

/**
 * TODO: document
 *
 * @public
 */
class Searcherer extends EventEmitter {

  /**
   * TODO: document
   *
   * @param {?string} value -
   * @param {Dictionary|string[]} dictionary -
   * @param {Searcherer~SearchOptions} [options] -
   * @return {Searcherer~Result[]}
   * @public
   */
  static search(value, dictionary, options = {}) {
    const searcherer = new Searcherer();
    searcherer.register(dictionary);

    return searcherer.search(value, options);
  }

  /**
   * TODO: document
   *
   * @param {string} filePath -
   * @param {Dictionary|string[]} dictionary -
   * @param {Searcherer~SearchFileOptions} [options] -
   * @return {Promise.<Searcherer~Result[], Error>}
   * @public
   */
  static searchFile(filePath, dictionary, options = {}) {
    const searcherer = new Searcherer();
    searcherer.register(dictionary);

    return searcherer.searchFile(filePath, options);
  }

  /**
   * TODO: document
   *
   * @param {string} filePath -
   * @param {Dictionary|string[]} dictionary -
   * @param {Searcherer~SearchFileOptions} [options] -
   * @return {Searcherer~Result[]}
   * @throws {Error}
   * @public
   */
  static searchFileSync(filePath, dictionary, options = {}) {
    const searcherer = new Searcherer();
    searcherer.register(dictionary);

    return searcherer.searchFileSync(filePath, options);
  }

  /**
   * TODO: document
   *
   * @public
   */
  constructor() {
    super();

    this[_dictionaries] = new Set();
  }

  /**
   * TODO: document
   *
   * @param {Dictionary|string[]} dictionary -
   * @return {void}
   * @fires Searcherer#register
   * @public
   */
  register(dictionary) {
    if (Array.isArray(dictionary)) {
      dictionary = new Dictionary({ patterns: dictionary });
    }

    this[_dictionaries].add(dictionary);

    /**
     * TODO: document
     *
     * @event Searcherer#register
     * @type {Object}
     * @property {Dictionary} dictionary -
     */
    this.emit('register', { dictionary });
  }

  /**
   * TODO: document
   *
   * @param {string} filePath -
   * @return {Promise.<void, Error>}
   * @fires Searcherer#register
   * @public
   */
  async registerFile(filePath) {
    debug('Reading dictionary file: %s', chalk.blue(filePath));

    const data = await readFile(filePath, 'utf8');
    const dictionary = Dictionary.parse(data, { name: path.basename(filePath) });

    debug('Registering "%s" dictionary from file: %s', dictionary.name, chalk.blue(filePath));

    this.register(dictionary);
  }

  /**
   * TODO: document
   *
   * @param {string} filePath -
   * @return {void}
   * @throws {Error}
   * @fires Searcherer#register
   * @public
   */
  registerFileSync(filePath) {
    debug('Reading dictionary file: %s', chalk.blue(filePath));

    const data = fs.readFileSync(filePath, 'utf8');
    const dictionary = Dictionary.parse(data, { name: path.basename(filePath) });

    debug('Registering "%s" dictionary from file: %s', dictionary.name, chalk.blue(filePath));

    this.register(dictionary);
  }

  /**
   * TODO: document
   *
   * @param {?string} value -
   * @param {Searcherer~SearchOptions} [options] -
   * @return {Searcherer~Result[]}
   * @fires Searcherer#end
   * @fires Searcherer#result
   * @fires Searcherer#search
   * @public
   */
  search(value, options = {}) {
    if (!value) {
      return [];
    }

    debug('Searching value with %d %s using options: %o', value.length, pluralize('character', value.length), options);

    /**
     * TODO: document
     *
     * @event Searcherer#search
     * @type {Object}
     * @property {Searcherer~SearchOptions} options -
     * @property {string} value -
     */
    this.emit('search', { options, value });

    const lines = value.split(/\r\n?|\n/g);
    const results = [];

    try {
      lines.forEach((line, lineNumber) => this[_searchLine]({ lineNumber, line, lines, options, results, value }));
    } catch (e) {
      /**
       * TODO: document
       *
       * @event Searcherer#error
       * @type {Error}
       */
      this.emit('error', e);

      throw e;
    }

    /**
     * TODO: document
     *
     * @event Searcherer#end
     * @type {Object}
     * @property {Searcherer~SearchOptions} options -
     * @property {Searcherer~Result[]} results -
     * @property {string} value -
     */
    this.emit('end', { options, results, value });

    debug('%d %s found!', results.length, pluralize('result', results.length));

    return results;
  }

  /**
   * TODO: document
   *
   * @param {string} filePath -
   * @param {Searcherer~SearchFileOptions} [options] -
   * @return {Promise.<Searcherer~Result[], Error>}
   * @fires Searcherer#end
   * @fires Searcherer#result
   * @fires Searcherer#search
   * @public
   */
  async searchFile(filePath, options = {}) {
    debug('Searching file: %s', chalk.blue(filePath));

    const data = await readFile(filePath, options.encoding || 'utf8');

    return this.search(data, options);
  }

  /**
   * TODO: document
   *
   * @param {string} filePath -
   * @param {Searcherer~SearchFileOptions} [options] -
   * @return {Searcherer~Result[]}
   * @throws {Error}
   * @fires Searcherer#end
   * @fires Searcherer#result
   * @fires Searcherer#search
   * @public
   */
  searchFileSync(filePath, options = {}) {
    debug('Searching file: %s', chalk.blue(filePath));

    const data = fs.readFileSync(filePath, options.encoding || 'utf8');

    return this.search(data, options);
  }

  [_searchLine](context) {
    debug('Searching line %d/%d', context.lineNumber, context.lines.length);

    let dictionaries = this[_dictionaries];
    const filter = context.options.filter;

    if (typeof filter === 'function') {
      dictionaries = dictionaries.filter((dictionary) => filter(dictionary));
    }

    dictionaries.forEach((dictionary) => this[_searchWithDictionary](dictionary, context));
  }

  [_searchWithDictionary](dictionary, context) {
    let match;
    const regExp = dictionary.getRegExp(Boolean(context.options.caseSensitive));

    debug('Searching line %d with "%s" dictionary', context.lineNumber, dictionary.name);

    while ((match = regExp.exec(context.line)) != null) {
      const result = {
        columnNumber: match.index,
        dictionary,
        line: context.line,
        lineNumber: context.lineNumber,
        match: match[0],
        pattern: match[2]
      };

      debug('Found result on line %d: %o', context.lineNumber, result);

      context.results.push(result);

      /**
       * TODO: document
       *
       * @event Searcherer#result
       * @type {Object}
       * @property {Searcherer~Result} result -
       */
      this.emit('result', { result });
    }
  }

}

module.exports = Searcherer;

/**
 * TODO: document
 *
 * @typedef {Object} Searcherer~SearchContext
 * @property {number} lineNumber -
 * @property {string} line -
 * @property {string[]} lines -
 * @property {Searcherer~SearchOptions} options -
 * @property {Searcherer~Result[]} results -
 * @property {string} value -
 */

/**
 * TODO: document
 *
 * @typedef {Searcherer~SearchOptions} Searcherer~SearchFileOptions
 * @property {string} [encoding="utf8"] -
 */

/**
 * TODO: document
 *
 * @typedef {Object} Searcherer~SearchOptions
 * @property {boolean} [caseSensitive] -
 * @property {Searcherer~DictionaryFilter} [filter] -
 */

/**
 * TODO: document
 *
 * @callback Searcherer~DictionaryFilter
 * @param {Dictionary} dictionary -
 * @return {boolean}
 */

/**
 * TODO: document
 *
 * @typedef {Object} Searcherer~Result
 * @property {number} columnNumber -
 * @property {Dictionary} dictionary -
 * @property {string} line -
 * @property {number} lineNumber -
 * @property {string} match -
 * @property {string} pattern -
 */
