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

const debug = require('debug')('searcherer:api');

const _createRegExpMap = Symbol('createRegExpMap');
const _name = Symbol('name');
const _patterns = Symbol('patterns');
const _regExpMaps = Symbol('regExpMaps');

/**
 * TODO: document
 *
 * @public
 */
class Dictionary {

  /**
   * TODO: document
   *
   * @param {?string} str -
   * @param {Dictionary~Options} [defaults] -
   * @return {?Dictionary}
   * @throws {SyntaxError}
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

    if (Array.isArray(data)) {
      return new Dictionary({ patterns: data });
    }

    return new Dictionary({
      name: data.name || defaults.name,
      patterns: data.patterns || defaults.patterns
    });
  }

  /**
   * TODO: document
   *
   * @param {Dictionary~Options} [options] -
   * @public
   */
  constructor(options = {}) {
    this[_name] = options.name || '<unknown>';
    this[_patterns] = new Set(options.patterns || []);
    this[_regExpMaps] = new Map();
  }

  /**
   * TODO: document
   *
   * @param {string} pattern -
   * @return {boolean}
   * @public
   */
  has(pattern) {
    return this[_patterns].has(pattern);
  }

  /**
   * TODO: document
   *
   * @param {Searcherer~SearchContext} context -
   * @return {Iterable.<Searcherer~Result>}
   * @public
   */
  *search(context) {
    const regExpMap = this[_createRegExpMap](Boolean(context.options.caseSensitive));

    for (const [ pattern, regExp ] of regExpMap) {
      let match;

      while ((match = regExp.exec(context.line)) != null) {
        yield {
          columnNumber: match.index,
          dictionary: this,
          line: context.line,
          lineNumber: context.lineNumber,
          match: match[0],
          pattern
        };
      }
    }
  }

  /**
   * @inheritdoc
   * @override
   */
  toString() {
    return this[_name] || super.toString();
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
      regExpMap.set(pattern, new RegExp(pattern, flags));
    }

    this[_regExpMaps].set(caseSensitive, regExpMap);

    return regExpMap;
  }

  /**
   * TODO: document
   *
   * @return {?string}
   * @public
   */
  get name() {
    return this[_name];
  }

  /**
   * TODO: document
   *
   * @return {string[]}
   * @public
   */
  get patterns() {
    return Array.from(this[_patterns]);
  }

}

module.exports = Dictionary;

/**
 * TODO: document
 *
 * @typedef {Object} Dictionary~Options
 * @property {string} [name="<unknown>"] -
 * @property {string[]} [patterns=[]] -
 */
