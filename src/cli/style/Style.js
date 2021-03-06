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

const debug = require('debug')('searcherer:cli:style');
const pollock = require('pollock');

const _default = Symbol('default');
const _instances = Symbol('instances');

/**
 * Can apply a format style to the command-line output.
 *
 * Implementations should have a unique style that has a single purpose (e.g. supports a single markup language or
 * syntax) and <b>must</b> be registered using {@link Style.addStyle} in order to be available at runtime.
 *
 * The {@link Style#render} method is used to return the string that is to be written to the output stream based on the
 * results.
 *
 * @public
 */
class Style {

  /**
   * Adds the specified <code>style</code>, optionally indicating that it is also to be registered as the default
   * {@link Style}.
   *
   * <code>style</code> can either be an instance of {@link Style} or a constructor for one. If the latter, it will be
   * initialized and the resulting instance will be added.
   *
   * If a style with of the same name has already been added, it will be silently replaced by <code>style</code>.
   * Likewise if a style has already been registered as the default and <code>defaultStyle</code> is <code>true</code>.
   *
   * @param {Function|Style} style - the {@link Style} to be added or its constructor
   * @param {boolean} [defaultStyle] - <code>true</code> to register <code>style</code> as the default {@link Style};
   * otherwise <code>false</code>
   * @return {Style} A reference to <code>style</code> if it's an instance of {@link Style}; otherwise the instance
   * created when <code>style</code> was instantiated.
   * @public
   */
  static addStyle(style, defaultStyle) {
    /* eslint-disable new-cap */
    const instance = typeof style === 'function' ? new style() : style;
    /* eslint-enable new-cap */
    const name = instance.getName();

    if (Style[_instances].has(name)) {
      debug('Overwriting existing style: %s', name);
    }

    Style[_instances].set(name, instance);

    if (defaultStyle) {
      debug('Setting default style to "%s"', name);

      Style[_default] = instance;
    }

    return instance;
  }

  /**
   * Finds the {@link Style} whose name matches the specified <code>name</code>.
   *
   * This method will return <code>null</code> if no style could be found for <code>name</code>.
   *
   * @param {string} name - the name of the style to be returned
   * @return {?Style} The style whose names matches <code>name</code> or <code>null</code> if none could be found.
   * @public
   */
  static findStyle(name) {
    return Style[_instances].get(name);
  }

  /**
   * Returns the default {@link Style}.
   *
   * @return {Style} The default style.
   * @public
   */
  static getDefaultStyle() {
    return Style[_default];
  }

  /**
   * Returns a copy of all of the available {@link Style} instances.
   *
   * @return {Style[]} The styles.
   * @public
   */
  static getStyles() {
    return Array.from(Style[_instances].values());
  }

  /**
   * @inheritdoc
   * @override
   */
  toString() {
    return this.getName();
  }

}

/**
 * Returns the name of this {@link Style}.
 *
 * This is used by {@link CLI} when looking up styles based on the value passed to the <code>--style</code> option.
 *
 * All implementations of {@link Style} <b>must</b> override this method.
 *
 * @return {string} The name.
 * @public
 * @abstract
 * @memberof Style#
 * @method getName
 */
pollock(Style, 'getName');

/**
 * Renders the specified <code>results</code> using the <code>options</code> provided and returns the string to be
 * written to the output stream.
 *
 * @param {Searcherer~Result[]} results - the results to be rendered
 * @param {Style~RenderOptions} options - the options to be used
 * @return {string} The rendered string to be written to the output stream.
 * @public
 * @abstract
 * @memberof Style#
 * @method render
 */
pollock(Style, 'render');

Style[_instances] = new Map();

module.exports = Style;

/**
 * The options that can be passed to the {@link Style#render} method.
 *
 * @typedef {Object} Style~RenderOptions
 * @property {CLI} cli - The {@link CLI} responsible for the render.
 * @property {string} filePath - The path of file being searched.
 */
