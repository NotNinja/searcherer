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

const debug = require('debug')('searcherer:api');

const _createRegExpMap = Symbol('createRegExpMap');
const _name = Symbol('name');
const _patterns = Symbol('patterns');
const _regExpMaps = Symbol('regExpMaps');

/**
 * Contains a dictionary of patterns, which are treated as regular expressions, that can be used to search strings.
 *
 * While dictionaries are mostly created internally by the static methods on {@link Searcherer}, it's encouraged to
 * create <code>Dictionary</code> instances when searching a large number of patterns and/or using the same patterns to
 * search many different strings/files. Doing so will increase performance as regular expressions compiled from the
 * patterns are cached.
 *
 * @public
 */
class Dictionary {

  /**
   * Parses the specified string into a {@link Dictionary}.
   *
   * Optionally, <code>defaults</code> can be provided to control the default values that are to be used if the data
   * parsed from <code>str</code> is incomplete.
   *
   * By default, <code>str</code> is parsed as JSON and this method is primarily intended to be used internally to parse
   * "dictionary files" via methods on {@link Searcherer}, however, this can be used externally as well. The parsed data
   * can be any of the following types:
   *
   * <ul>
   *   <li>string - used as a single search pattern</li>
   *   <li>array - used as search patterns</li>
   *   <li>object - uses values of the <code>name</code> and <code>patterns</code> properties accordingly</li>
   * </ul>
   *
   * However, implementations are free to override this behavior as needed.
   *
   * This method will return <code>null</code> if <code>str</code> is <code>null</code> or the JSON is parsed to
   * <code>null</code>.
   *
   * An error will occur if <code>str</code> contains invalid JSON.
   *
   * @param {?string} str - the string to be parsed (may be <code>null</code>)
   * @param {Dictionary~Options} [defaults] - the default values to be used to fill missing data
   * @return {?Dictionary} A {@link Dictionary} parsed from <code>str</code> or <code>null</code> if <code>str</code> is
   * <code>null</code> or it's the result of being parsed as JSON.
   * @throws {SyntaxError} If <code>str</code> contains invalid JSON.
   * @public
   */
  static parse(str, defaults = {}) {
    debug('Parsing dictionary from string: %s', str);

    if (str == null) {
      return null;
    }

    const data = JSON.parse(str);
    if (data == null) {
      return null;
    }

    if (typeof data === 'string' || Array.isArray(data)) {
      return new Dictionary({ patterns: data });
    }
    return new Dictionary({
      name: data.name || defaults.name,
      patterns: data.patterns || defaults.patterns
    });
  }

  /**
   * Creates an instance of {@link Dictionary} using the <code>options</code> provided.
   *
   * @param {Dictionary~Options} [options] - the options to be used
   * @public
   */
  constructor(options = {}) {
    const name = options.name || '<unknown>';
    const patterns = options.patterns != null ? options.patterns : [];

    this[_name] = name;
    this[_patterns] = new Set(Array.isArray(patterns) ? patterns : [ patterns ]);
    this[_regExpMaps] = new Map();
  }

  /**
   * Creates a <code>RegExp</code> instance for the specified <code>pattern</code> and <code>flags</code>.
   *
   * @param {string} pattern - the pattern for which the <code>RegExp</code> is to be created
   * @param {string} flags - the flags to be used
   * @return {RegExp} A newly created <code>RegExp</code>.
   * @protected
   */
  createRegExp(pattern, flags) {
    return new RegExp(pattern, flags);
  }

  /**
   * Creates a search result based on the information provided.
   *
   * @param {string} pattern - the pattern responsible for the match
   * @param {Dictionary~RegExpMatch} match - the regular expression match
   * @param {Searcherer~SearchContext} context - the context whose line contained the match
   * @return {Searcherer~Result} The search result.
   * @public
   */
  createResult(pattern, match, context) {
    return {
      columnNumber: match.index,
      dictionary: this,
      line: context.line,
      lineNumber: context.lineNumber,
      match: match[0],
      pattern
    };
  }

  /**
   * Returns whether this {@link Dictionary} contains the specified <code>pattern</code>.
   *
   * @param {string} pattern - the pattern to be checked
   * @return {boolean} <code>true</code> if <code>pattern</code> exits; otherwise <code>false</code>.
   * @public
   */
  has(pattern) {
    return this[_patterns].has(pattern);
  }

  /**
   * Searches the line within the specified <code>context</code> using the patterns within this {@link Dictionary} and
   * iterates over the results.
   *
   * @param {Searcherer~SearchContext} context - the context whose line is to be searched
   * @return {Iterable.<Searcherer~Result>} An <code>Iterable</code> for each search result.
   * @public
   */
  *search(context) {
    const regExpMap = this[_createRegExpMap](Boolean(context.options.caseSensitive));

    for (const [ pattern, regExp ] of regExpMap) {
      let match;

      while ((match = regExp.exec(context.line)) != null) {
        yield this.createResult(pattern, match, context);
      }
    }
  }

  /**
   * @inheritdoc
   * @override
   */
  toString() {
    return this[_name];
  }

  /**
   * @inheritdoc
   * @override
   */
  *[Symbol.iterator]() {
    yield* this[_patterns];
  }

  [_createRegExpMap](caseSensitive) {
    let regExpMap = this[_regExpMaps].get(caseSensitive);
    if (regExpMap) {
      return regExpMap;
    }

    const flags = caseSensitive ? 'g' : 'gi';
    regExpMap = new Map();

    for (const pattern of this[_patterns]) {
      regExpMap.set(pattern, this.createRegExp(pattern, flags));
    }

    this[_regExpMaps].set(caseSensitive, regExpMap);

    return regExpMap;
  }

  /**
   * Returns the name of this {@link Dictionary}.
   *
   * @return {string} The name.
   * @public
   */
  get name() {
    return this[_name];
  }

  /**
   * Returns a copy of the search patterns for this {@link Dictionary}.
   *
   * @return {string[]} The patterns.
   * @public
   */
  get patterns() {
    return Array.from(this[_patterns]);
  }

}

module.exports = Dictionary;

/**
 * A {@link RegExp} match.
 *
 * @typedef {Array} Dictionary~RegExpMatch
 * @property {number} index - The 0-based index of the match in the string.
 * @property {string} input - The original string.
 */

/**
 * The options that can be passed to the {@link Dictionary} constructor.
 *
 * @typedef {Object} Dictionary~Options
 * @property {string} [name="<unknown>"] - The name.
 * @property {string|string[]} [patterns=[]] - The search pattern(s).
 */
