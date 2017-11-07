     .d8888b.                                    888
    d88P  Y88b                                   888
    Y88b.                                        888
     "Y888b.    .d88b.   8888b.  888d888 .d8888b 88888b.   .d88b.  888d888 .d88b.  888d888
        "Y88b. d8P  Y8b     "88b 888P"  d88P"    888 "88b d8P  Y8b 888P"  d8P  Y8b 888P"
          "888 88888888 .d888888 888    888      888  888 88888888 888    88888888 888
    Y88b  d88P Y8b.     888  888 888    Y88b.    888  888 Y8b.     888    Y8b.     888
     "Y8888P"   "Y8888  "Y888888 888     "Y8888P 888  888  "Y8888  888     "Y8888  888

[Searcherer](https://github.com/NotNinja/searcherer) is a [Node.js](https://nodejs.org) module for searching strings or
files.

[![Build Status](https://img.shields.io/travis/NotNinja/searcherer/develop.svg?style=flat-square)](https://travis-ci.org/NotNinja/searcherer)
[![Dependency Status](https://img.shields.io/david/NotNinja/searcherer.svg?style=flat-square)](https://david-dm.org/NotNinja/searcherer)
[![Dev Dependency Status](https://img.shields.io/david/dev/NotNinja/searcherer.svg?style=flat-square)](https://david-dm.org/NotNinja/searcherer?type=dev)
[![License](https://img.shields.io/npm/l/searcherer.svg?style=flat-square)](https://github.com/NotNinja/searcherer/blob/master/LICENSE.md)
[![Release](https://img.shields.io/npm/v/searcherer.svg?style=flat-square)](https://www.npmjs.com/package/searcherer)

* [Install](#install)
* [CLI](#cli)
* [API](#api)
* [Bugs](#bugs)
* [Contributors](#contributors)
* [License](#license)

## Install

Install using `npm`:

``` bash
$ npm install --save searcherer
```

You'll need to have at least [Node.js](https://nodejs.org) 8 or newer.

If you want to use the command line interface you'll most likely want to install it globally so that you can run
`searcherer` from anywhere:

``` bash
$ npm install --global searcherer
```

## CLI

    Usage: searcherer [options] [files...]
    
    
    Options:
    
      -V, --version              output the version number
      --no-color                 disables color output
      -c, --case-sensitive       enable case-sensitive search
      -d, --debug                enable debug level logging
      -e, --encoding <encoding>  specify encoding for input [utf8]
      -f, --filename <filename>  specify filename to process STDIN as [<text>]
      -p, --pattern <pattern>    search for pattern
      -s, --style <name>         specify style for output [default]
      -h, --help                 output usage information

## API

The API has been designed to be just as simple to use as the CLI. It uses ECMAScript 2015's promises to handle the
asynchronous flows of file reading (with `Sync` methods available as well) so you can keep your code nice and clean.

Each search result contains the following information:

| Property       | Type       | Description                                                       |
| -------------- | ---------- | ----------------------------------------------------------------- |
| `columnNumber` | Number     | Column number at which the match was found                        |
| `dictionary`   | Dictionary | Dictionary to which the pattern responsible for the match belongs |
| `line`         | String     | Complete line of text in which the match was found                |
| `lineNumber`   | Number     | Line number in relation to the whole string being searched        |
| `match`        | String     | Exact match that was found                                        |
| `pattern`      | String     | Pattern responsible for the match                                 |

### `Searcherer.search(value, dictionary[, options])`

Searches the specified `value` for the patterns within the specified `dictionary` using the `options` provided.

`dictionary` can either be a `Dictionary` instance or one or more of search patterns from which a `Dictionary` instance
can be created.

#### Options

| Option           | Description                                                            | Default      |
| ---------------- | ---------------------------------------------------------------------- | ------------ |
| `caseSensitive` | Perform case-sensitive search on `value`                                | `false`      |
| `filter`        | Function to be used to filter which dictionaries are included in search | *All*        |

#### Examples

``` javascript
const Searcherer = require('searcherer');

const results = Searcherer.search('We love Searcherer! It is great for searching strings', 'search(er){0,2}');

console.log(results);
```

### `Searcherer.searchFile(filePath, dictionary[, options])`

Searches the contents that are asynchronously read from the file at the specified path for the patterns within the
specified `dictionary` using the `options` provided.

`dictionary` can either be a `Dictionary` instance or one or more of search patterns from which a `Dictionary` instance
can be created.

The `encoding` option can be used to specify how the contents of the file are encoded.

#### Options

Has the same options as the standard `Searcherer.search` method but also supports the following additional options:

| Option     | Description                                         | Default  |
| ---------- | --------------------------------------------------- | -------- |
| `encoding` | Encoding of the contents of the file to be searched | `"utf8"` |

#### Examples

``` javascript
const Searcherer = require('searcherer');

(async() => {
  const results = await Searcherer.searchFile('/path/to/file', 'search(er){0,2}', { caseSensitive: true });
  
  console.log(results);
})();
```

### `Searcherer.searchFileSync(filePath, dictionary[, options])`

A synchronous version of the `Searcherer.searchFile` method.

### `Searcherer([options])`

Creates an instance of `Searcherer` using the `options` provided.

The `dictionary` option can be specified to initialize `Searcherer` with a single `Dictionary`. It can be either a
`Dictionary` instance or one or more of search patterns from which a `Dictionary` instance can be created.

While the static methods of `Searcherer` for searching work great, it's encouraged to create `Searcherer` instances when
dealing with multiple dictionaries (collections of search patterns). Additionally, it's **highly recommended** that
`Dictionary` instances are created when searching a large number of patterns and/or using the same patterns to search
many different strings/files. Doing so will increase performance as regular expressions compiled from the patterns are
cached.

The following instance methods exist to mirror the static methods for searching:

* `Searcherer#search(value[, options])`
* `Searcherer#searchFile(filePath[, options])`
* `Searcherer#searchFileSync(filePath[, options])`

Additionally, the following instance methods exist that allow dictionaries to be added to a `Searcherer` instance:

* `Searcherer#addDictionary(dictionary)`
* `Searcherer#addDictionaryFile(filePath)`
* `Searcherer#addDictionaryFileSync(filePath)`

#### Options

| Option           | Description                                                           | Default      |
| ---------------- | --------------------------------------------------------------------- | ------------ |
| `dictionary`     | Initial `Dictionary` or the search pattern(s) to be used to create it | N/A          |
| `dictionaryType` | `Dictionary` implementation whose instances are to be created         | `Dictionary` |

#### Events

Each of the search methods can emit the following events:

| Event    | Description                                     |
| -------- | ----------------------------------------------- |
| `end`    | Fired once the search has completed             |
| `result` | Fired immediately when a search result is found |
| `search` | Fired immediately before the value is searched  |

#### Examples

``` javascript
const Searcherer = require('searcherer');
const { Dictionary } = Searcherer;

(async() => {
  const searcherer = new Searcher();
  searcherer.addDictionary(new Dictionary({ name: 'foo', patterns: [ ... ] ));
  searcherer.addDictionary(new Dictionary({ name: 'bar', patterns: [ ... ] ));
  
  const results = await searcherer.searchFile('/path/to/file', { caseSensitive: true });
  
  console.log(results);
})();
```

## Bugs

If you have any problems with Searcherer or would like to see changes currently in development you can do so
[here](https://github.com/NotNinja/searcherer/issues).

## Contributors

If you want to contribute, you're a legend! Information on how you can do so can be found in
[CONTRIBUTING.md](https://github.com/NotNinja/searcherer/blob/master/CONTRIBUTING.md). We want your suggestions and pull
requests!

A list of Searcherer contributors can be found in
[AUTHORS.md](https://github.com/NotNinja/searcherer/blob/master/AUTHORS.md).

## License

See [LICENSE.md](https://github.com/NotNinja/searcherer/raw/master/LICENSE.md) for more information on our MIT license.

[![Copyright !ninja](https://cdn.rawgit.com/NotNinja/branding/master/assets/copyright/base/not-ninja-copyright-186x25.png)](https://not.ninja)
