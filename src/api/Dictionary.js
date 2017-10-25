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

const _name = Symbol('name');
const _patterns = Symbol('patterns');
const _regExp = Symbol('regExp');

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
    this[_name] = options.name;
    this[_patterns] = new Set(options.patterns || []);
    this[_regExp] = new Map();
  }

  /**
   * TODO: document
   *
   * @param {boolean} [caseSensitive] -
   * @return {RegExp}
   * @public
   */
  getRegExp(caseSensitive = false) {
    const { name } = this;
    const type = caseSensitive ? 'case-sensitive' : 'case-insensitive';

    debug('Getting %s regular expression for "%s" dictionary', type, name);

    let regExp = this[_regExp].get(caseSensitive);
    if (regExp) {
      debug('A %s regular expression has already been generated for "%s" dictionary', type, name);

      return regExp;
    }

    // TODO: don't strip regexp characters (or do it cleanly to allow some)
    const patterns = [];
    for (const pattern of this[_patterns]) {
      patterns.push(pattern.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));
    }

    regExp = new RegExp(`([^\\s]*)(${patterns.join('|')})([^\\s]*)`, caseSensitive ? 'g' : 'gi');

    this[_regExp].set(caseSensitive, regExp);

    debug('Generated %s regular expression for "%s" dictionary: %s', type, name, regExp);

    return regExp;
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
 * @property {string} [name] -
 * @property {string[]} [patterns] -
 */
