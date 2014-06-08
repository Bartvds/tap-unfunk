# tap-unfunk

[![Build Status](https://secure.travis-ci.org/Bartvds/tap-unfunk.png?branch=master)](http://travis-ci.org/Bartvds/tap-unfunk) [![NPM version](https://badge.fury.io/js/tap-unfunk.png)](http://badge.fury.io/js/tap-unfunk) [![Dependency Status](https://david-dm.org/Bartvds/tap-unfunk.png)](https://david-dm.org/Bartvds/tap-unfunk) [![devDependency Status](https://david-dm.org/Bartvds/tap-unfunk/dev-status.png)](https://david-dm.org/Bartvds/tap-unfunk#info=devDependencies)

> unfunky tap reporter with diffs, dots and many colors, tuned for both node-tap and tape

Works with the tap output from both [node-tap](https://github.com/isaacs/node-tap) as well as [tape](https://github.com/substack/tape) (and their many forks). Might work for other tap output too, who knows?

Diff support via [unfunk-diff](https://github.com/Bartvds/unfunk-diff), so diffing strings and objects are supported,  even in tape!

This is the tap equivalent of [mocha-unfunk-reporter](https://github.com/Bartvds/mocha-unfunk-reporter) except this reporter uses progress dots instead of a spec tree.

Note: early release, please leave your edge cases in the [issues](https://github.com/Bartvds/tap-unfunk/issues).

## Install

```
npm install tap-unfunk --save-dev
```

## Usage

### package.json

```json
{
  "scripts": {
    "test": "node ./test/tap-test.js | tap-unfunk"
  }
}
```

Then run with `npm test`

### Terminal

```
tap test/index.js | node_modules/.bin/tap-unfunk
```

```
tape test/index.js | node_modules/.bin/tap-unfunk
```

## Example

<pre style="background-color: black; font-family: monospace;">
saasdsd
</pre>

## Todo

- expose option for plain text, css and html output


## History

* 0.1.0 - First release

## License

Copyright (c) 2014 [Bartvds](https://github.com/Bartvds)

Licensed under the MIT license.
