# tap-unfunk

[![Build Status](https://secure.travis-ci.org/Bartvds/tap-unfunk.png?branch=master)](http://travis-ci.org/Bartvds/tap-unfunk) [![NPM version](https://badge.fury.io/js/tap-unfunk.png)](http://badge.fury.io/js/tap-unfunk) [![Dependency Status](https://david-dm.org/Bartvds/tap-unfunk.png)](https://david-dm.org/Bartvds/tap-unfunk) [![devDependency Status](https://david-dm.org/Bartvds/tap-unfunk/dev-status.png)](https://david-dm.org/Bartvds/tap-unfunk#info=devDependencies)

> unfunky tap reporter with diffs, dots and many colors, tuned for both node-tap and tape

Works with the tap output from both [node-tap](https://github.com/isaacs/node-tap) as well as [tape](https://github.com/substack/tape) (and their many forks). Might work for other tap output too, who knows?

Diff support via [unfunk-diff](https://github.com/Bartvds/unfunk-diff), so diffing strings and objects are supported,  even in tape!

This is the tap equivalent of [mocha-unfunk-reporter](https://github.com/Bartvds/mocha-unfunk-reporter), except it uses dots instead of a spec.

Note: early release, please leave your edge cases in the [issues](https://github.com/Bartvds/tap-unfunk/issues).


## Todo

- add screenshots (automate)
- expose option for plain text, css and html output

## License

Copyright (c) 2014 [Bartvds](https://github.com/Bartvds)

Licensed under the MIT license.
