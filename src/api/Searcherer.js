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
const debug = require('debug')('searcherer:api');
const { EventEmitter } = require('events');
const fs = require('fs');
const iconv = require('iconv-lite');
const path = require('path');
const pluralize = require('pluralize');
const util = require('util');

const Dictionary = require('./Dictionary');

const readFile = util.promisify(fs.readFile);

const _addDictionaryFile = Symbol('addDictionaryFile');
const _dictionaries = Symbol('dictionaries');
const _dictionaryType = Symbol('dictionaryType');
const _searchFile = Symbol('searchFile');
const _searchLine = Symbol('searchLine');

/**
 * Can search a string or file for patterns, treated as regular expressions.
 *
 * While the static methods of <code>Searcherer</code> for searching work great, it's encouraged to create
 * <code>Searcherer</code> instances when dealing with multiple dictionaries (collections of search patterns).
 * Additionally, it's <b>highly recommended</b> that {@link Dictionary} instances are created when searching a large
 * number of patterns and/or using the same patterns to search many different strings/files. Doing so will increase
 * performance as regular expressions compiled from the patterns are cached.
 *
 * @public
 */
class Searcherer extends EventEmitter {

  /**
   * Searches the specified <code>value</code> for the patterns within the specified <code>dictionary</code> using the
   * <code>options</code> provided.
   *
   * <code>dictionary</code> can either be a {@link Dictionary} instance or one or more of search patterns from which a
   * {@link Dictionary} instance can be created.
   *
   * @param {?string} value - the value to be searched (may be <code>null</code>)
   * @param {Dictionary|string|string[]} dictionary - the {@link Dictionary} to be used or the search pattern(s) to be
   * used to create it
   * @param {Searcherer~SearchOptions} [options] - the options to be used
   * @return {Searcherer~Result[]} The search results.
   * @public
   */
  static search(value, dictionary, options = {}) {
    const searcherer = new Searcherer({ dictionary });
    return searcherer.search(value, options);
  }

  /**
   * Searches the contents that are asynchronously read from the file at the specified path for the patterns within the
   * specified <code>dictionary</code> using the <code>options</code> provided.
   *
   * <code>dictionary</code> can either be a {@link Dictionary} instance or one or more of search patterns from which a
   * {@link Dictionary} instance can be created.
   *
   * The <code>encoding</code> option can be used to specify how the contents of the file are encoded.
   *
   * An error will occur if the file cannot be read.
   *
   * @param {string} filePath - the path of the file whose contents are to be searched
   * @param {Dictionary|string|string[]} dictionary - the {@link Dictionary} to be used or the search pattern(s) to be
   * used to create it
   * @param {Searcherer~SearchFileOptions} [options] - the options to be used
   * @return {Promise.<Searcherer~Result[], Error>} A <code>Promise</code> for the asynchronous file reading that is
   * resolved with the search results.
   * @see {@link Searcherer.searchFileSync}
   * @public
   */
  static searchFile(filePath, dictionary, options = {}) {
    const searcherer = new Searcherer({ dictionary });
    return searcherer.searchFile(filePath, options);
  }

  /**
   * Searches the contents that are synchronously read from the file at the specified path for the patterns within the
   * specified <code>dictionary</code> using the <code>options</code> provided.
   *
   * <code>dictionary</code> can either be a {@link Dictionary} instance or one or more of search patterns from which a
   * {@link Dictionary} instance can be created.
   *
   * The <code>encoding</code> option can be used to specify how the contents of the file are encoded.
   *
   * An error will occur if the file cannot be read.
   *
   * @param {string} filePath - the path of the file whose contents are to be searched
   * @param {Dictionary|string|string[]} dictionary - the {@link Dictionary} to be used or the search pattern(s) to be
   * used to create it
   * @param {Searcherer~SearchFileOptions} [options] - the options to be used
   * @return {Searcherer~Result[]} The search results.
   * @throws {Error} If the file cannot be read.
   * @see {@link Searcherer.searchFile}
   * @public
   */
  static searchFileSync(filePath, dictionary, options = {}) {
    const searcherer = new Searcherer({ dictionary });
    return searcherer.searchFileSync(filePath, options);
  }

  /**
   * Creates an instance of {@link Searcherer} using the <code>options</code> provided.
   *
   * The <code>dictionary</code> option can be specified to initialize {@link Searcherer} with a single
   * {@link Dictionary}. It can be either a {@link Dictionary} instance or one or more of search patterns from which a
   * {@link Dictionary} instance can be created.
   *
   * @param {Searcherer~Options} [options] - the options to be used
   * @public
   */
  constructor(options = {}) {
    super();

    this[_dictionaries] = new Set();
    this[_dictionaryType] = options.dictionaryType || Dictionary;

    if (options.dictionary) {
      this.addDictionary(options.dictionary);
    }
  }

  /**
   * Adds the specified <code>dictionary</code> to this {@link Searcherer}.
   *
   * <code>dictionary</code> can either be a {@link Dictionary} instance or one or more of search patterns from which a
   * {@link Dictionary} instance can be created.
   *
   * @param {Dictionary|string|string[]} dictionary - the {@link Dictionary} to be added or the search pattern(s) to be
   * used to create it
   * @return {Dictionary} A reference to <code>dictionary</code> if it's an instance of {@link Dictionary}; otherwise
   * the instance created based on <code>dictionary</code>.
   * @public
   */
  addDictionary(dictionary) {
    if (typeof dictionary === 'string' || Array.isArray(dictionary)) {
      const DictionaryImpl = this[_dictionaryType];
      dictionary = new DictionaryImpl({ patterns: dictionary });
    }

    this[_dictionaries].add(dictionary);

    return dictionary;
  }

  /**
   * Parses a {@link Dictionary} from the contents that are asynchronously read from the file at the specified path and
   * adds it to this {@link Searcherer}.
   *
   * This method assumes that the contents of the file are UTF-8 encoded.
   *
   * An error will occur if the file cannot be read or contains invalid JSON.
   *
   * @param {string} filePath - the path of the file whose contents are to be read and parsed into a {@link Dictionary}
   * and then added
   * @return {Promise.<?Dictionary, Error>} A <code>Promise</code> for the asynchronous file reading that is resolved
   * with the parsed {@link Dictionary} or <code>null</code> if the file contained no data.
   * @see {@link Dictionary.parse}
   * @see {@link Searcherer#addDictionaryFileSync}
   * @public
   */
  async addDictionaryFile(filePath) {
    debug('Reading dictionary file: %s', chalk.blue(filePath));

    const data = await readFile(filePath, 'utf8');

    return this[_addDictionaryFile](data, filePath);
  }

  /**
   * Parses a {@link Dictionary} from the contents that are synchronously read from the file at the specified path and
   * adds it to this {@link Searcherer}.
   *
   * This method assumes that the contents of the file are UTF-8 encoded.
   *
   * An error will occur if the file cannot be read or contains invalid JSON.
   *
   * @param {string} filePath - the path of the file whose contents are to be read and parsed into a {@link Dictionary}
   * and then added
   * @return {?Dictionary} The parsed {@link Dictionary} or <code>null</code> if the file contained no data.
   * @throws {Error} If the file cannot be read or contains invalid JSON.
   * @see {@link Dictionary.parse}
   * @see {@link Searcherer#addDictionaryFile}
   * @public
   */
  addDictionaryFileSync(filePath) {
    debug('Reading dictionary file: %s', chalk.blue(filePath));

    const data = fs.readFileSync(filePath, 'utf8');

    return this[_addDictionaryFile](data, filePath);
  }

  /**
   * Finds the {@link Dictionary} whose name matches the specified <code>name</code> within this {@link Searcherer}.
   *
   * This method will return <code>null</code> if no dictionary could be found for <code>name</code>.
   *
   * @param {string} name - the name of the dictionary to be returned
   * @return {?Dictionary} The dictionary whose names matches <code>name</code> or <code>null</code> if none could be
   * found.
   * @public
   */
  findDictionary(name) {
    for (const dictionary of this[_dictionaries]) {
      if (dictionary.name === name) {
        return dictionary;
      }
    }

    return null;
  }

  /**
   * Parses the specified string into a {@link Dictionary} based on the <code>dictionaryType</code> option with which
   * this {@link Searcherer} was initialized.
   *
   * @param {?string} str - the string to be parsed (may be <code>null</code>)
   * @param {Dictionary~Options} [defaults] - the default values to be used to fill missing data
   * @return {?Dictionary} A {@link Dictionary} parsed from <code>str</code> or <code>null</code> if <code>str</code> is
   * <code>null</code> or it's the result of being parsed as JSON.
   * @throws {SyntaxError} If <code>str</code> contains invalid JSON.
   * @see {@link Dictionary.parse}
   * @protected
   */
  parseDictionary(str, defaults = {}) {
    return this[_dictionaryType].parse(str, defaults);
  }

  /**
   * Searches the specified <code>value</code> for the patterns across all of the dictionaries within this
   * {@link Searcherer} using the <code>options</code> provided.
   *
   * The <code>filter</code> option can be used to control which dictionaries will have their patterns included in the
   * search.
   *
   * @param {?string} value - the value to be searched (may be <code>null</code>)
   * @param {Searcherer~SearchOptions} [options] - the options to be used
   * @return {Searcherer~Result[]} The search results.
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
     * The "search" event is fired immediately before the value is searched.
     *
     * @event Searcherer#search
     * @type {Object}
     * @property {Searcherer~SearchOptions} options - The options being used throughout the search.
     * @property {string} value - The value being searched.
     */
    this.emit('search', { options, value });

    const lines = value.split(/\r\n?|\n/g);
    const results = [];

    lines.forEach((line, lineNumber) => this[_searchLine]({ lineNumber, line, lines, options, results, value }));

    /**
     * The "end" event is fired once the search has completed.
     *
     * @event Searcherer#end
     * @type {Object}
     * @property {Searcherer~SearchOptions} options - The options that were used throughout the search.
     * @property {Searcherer~Result[]} results - The search results.
     * @property {string} value - The value that was searched.
     */
    this.emit('end', { options, results, value });

    debug('%d %s found!', results.length, pluralize('result', results.length));

    return results;
  }

  /**
   * Searches the contents that are asynchronously read from the file at the specified path for the patterns across all
   * of the dictionaries within this {@link Searcherer} using the <code>options</code> provided.
   *
   * The <code>encoding</code> option can be used to specify how the contents of the file are encoded.
   *
   * The <code>filter</code> option can be used to control which dictionaries will have their patterns included in the
   * search.
   *
   * An error will occur if the file cannot be read.
   *
   * @param {string} filePath - the path of the file whose contents are to be searched
   * @param {Searcherer~SearchFileOptions} [options] - the options to be used
   * @return {Promise.<Searcherer~Result[], Error>} A <code>Promise</code> for the asynchronous file reading that is
   * resolved with the search results.
   * @see {@link Searcherer#searchFileSync}
   * @fires Searcherer#end
   * @fires Searcherer#result
   * @fires Searcherer#search
   * @public
   */
  async searchFile(filePath, options = {}) {
    debug('Searching file: %s', chalk.blue(filePath));

    const buffer = await readFile(filePath);

    return this[_searchFile](buffer, options);
  }

  /**
   * Searches the contents that are synchronously read from the file at the specified path for the patterns across all
   * of the dictionaries within this {@link Searcherer} using the <code>options</code> provided.
   *
   * The <code>encoding</code> option can be used to specify how the contents of the file are encoded.
   *
   * The <code>filter</code> option can be used to control which dictionaries will have their patterns included in the
   * search.
   *
   * An error will occur if the file cannot be read.
   *
   * @param {string} filePath - the path of the file whose contents are to be searched
   * @param {Searcherer~SearchFileOptions} [options] - the options to be used
   * @return {Searcherer~Result[]} The search results.
   * @throws {Error} If the file cannot be read.
   * @see {@link Searcherer#searchFile}
   * @fires Searcherer#end
   * @fires Searcherer#result
   * @fires Searcherer#search
   * @public
   */
  searchFileSync(filePath, options = {}) {
    debug('Searching file: %s', chalk.blue(filePath));

    const buffer = fs.readFile(filePath);

    return this[_searchFile](buffer, options);
  }

  /**
   * Returns a copy of all of the {@link Dictionary} instances within this {@link Searcherer}.
   *
   * @return {Dictionary[]} The dictionaries.
   * @public
   */
  get dictionaries() {
    return Array.from(this[_dictionaries]);
  }

  [_addDictionaryFile](data, filePath) {
    const dictionary = this.parseDictionary(data, { name: path.basename(filePath) });

    if (dictionary) {
      debug('Adding "%s" dictionary from file: %s', dictionary.name, chalk.blue(filePath));

      this.addDictionary(dictionary);
    } else {
      debug('Dictionary not found in file: %s', chalk.blue(filePath));
    }

    return dictionary;
  }

  [_searchFile](buffer, options) {
    const value = iconv.decode(buffer, options.encoding || 'utf8');

    return this.search(value, options);
  }

  [_searchLine](context) {
    debug('Searching line %d/%d: %s', context.lineNumber, context.lines.length, context.line);

    let dictionaries = this[_dictionaries];
    const filter = context.options.filter;

    if (typeof filter === 'function') {
      dictionaries = dictionaries.filter((dictionary) => filter(dictionary));
    }

    for (const dictionary of dictionaries) {
      debug('Searching line %d with "%s" dictionary', context.lineNumber, dictionary.name);

      for (const result of dictionary.search(context)) {
        debug('Found result on line %d: %o', context.lineNumber, result);

        context.results.push(result);

        /**
         * The "result" event is fired immediately when a search result is found.
         *
         * @event Searcherer#result
         * @type {Object}
         * @property {Searcherer~Result} result - The search result.
         */
        this.emit('result', { result });
      }
    }
  }

}

Searcherer.Dictionary = Dictionary;

module.exports = Searcherer;

/**
 * Returns whether the patterns within the specified <code>dictionary</code> are to be searched for within the string.
 *
 * @callback Searcherer~DictionaryFilter
 * @param {Dictionary} dictionary - the {@link Dictionary} to be checked
 * @return {boolean} <code>true</code> to search for patterns within <code>dictionary</code>; otherwise
 * <code>false</code>.
 */

/**
 * The options that can be passed to the {@link Searcherer} constructor.
 *
 * @typedef {Object} Searcherer~Options
 * @property {Dictionary|string|string[]} [dictionary] - An initial {@link Dictionary} or the search pattern(s) to be
 * used to create it.
 * @property {Function} [dictionaryType=Dictionary] - The {@link Dictionary} implementation whose instances are to be
 * created.
 */

/**
 * Contains the information for an individual search result.
 *
 * @typedef {Object} Searcherer~Result
 * @property {number} columnNumber - The column number at which the match was found (i.e. the start index of the match
 * within the line).
 * @property {Dictionary} dictionary - The {@link Dictionary} to which the pattern responsible for the match belongs.
 * @property {string} line - The complete line of text in which the match was found.
 * @property {number} lineNumber - The line number in relation to the whole string being searched.
 * @property {string} match - The exact match that was found.
 * @property {string} pattern - The pattern responsible for the match.
 */

/**
 * Contains the information for an individual line search.
 *
 * While this contains the original string and all of the lines being searched, individual searches are performed on a
 * line-by-line basis.
 *
 * @typedef {Object} Searcherer~SearchContext
 * @property {number} lineNumber - The line number in relation to the whole string being searched.
 * @property {string} line - The complete line of text being searched.
 * @property {string[]} lines - All of the lines being searched.
 * @property {Searcherer~SearchOptions} options - The options to be used throughout the search.
 * @property {Searcherer~Result[]} results - The search results, so far.
 * @property {string} value - The whole string being searched.
 */

/**
 * The options that can be passed to the various search methods on {@link Searcherer} that involve reading files (either
 * synchronously or asynchronously).
 *
 * @typedef {Searcherer~SearchOptions} Searcherer~SearchFileOptions
 * @property {string} [encoding="utf8"] - The encoding of the contents of the file to be searched.
 */

/**
 * The options that can be passed to the various search methods on {@link Searcherer}.
 *
 * @typedef {Object} Searcherer~SearchOptions
 * @property {boolean} [caseSensitive] - <code>true</code> to perform a case-sensitive search on the string; otherwise
 * <code>false</code>.
 * @property {Searcherer~DictionaryFilter} [filter] - The function to be used to filter which dictionaries have their
 * patterns included in the search of the string. All dictionaries are provided by default.
 */
