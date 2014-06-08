'use strict';

var util = require('util');

var through = require('through2');
var duplexer = require('duplexer');

var parser = require('tap-parser');
var yamlish = require('yamlish');

var typeDetect = require('type-detect');
var jsesc = require('jsesc');
var style = require('ministyle').ansi();

var escapeString = require('./lib/escapeString');
var getViewWidth = require('./lib/getViewWidth');

var out = through();
var tap = parser();
var dup = duplexer(tap, out);

process.stdin
    .pipe(dup)
    .pipe(process.stdout);


var viewWidth = getViewWidth() - 2;
var dotLimit = getViewWidth(80) - 2 - 2;
var dotCount = 0;

var valueStrLim = 50;

var goodDot = style.plain('.');
var badDot = style.error('!');
var oddDot = style.warning('?');
var skipDot = style.muted('-');

function addDot(dot) {
    if (dotCount === 0) {
        write('  ');
    }
    else if (dotCount >= dotLimit) {
        writeln();
        write('  ');
        dotCount = 0;
    }
    write(arguments.length > 0 ? dot : oddDot);
    dotCount++;
}

var DiffFormatter = require('unfunk-diff').DiffFormatter;
var formatter = new DiffFormatter(style, viewWidth);

function write(line) {
    out.push(String(line));
}

function writeln(line) {
    if (arguments.length > 0) {
        out.push(String(line));
    }
    out.push('\n');
}

function plural(word, count) {
    if (count === 1) {
        return word;
    }
    return word + 's';
}

function fmtPosition(assert) {
    var str = '';
    if (assert.file) {
        str = assert.file;
    }
    if (typeof assert.column !== 'undefined' && typeof assert.line != 'undefined') {
        if (assert.file) {
            str += ' ';
        }
        str += '[' + assert.column + ',' + assert.line + ']';
    }
    return str;
}

function fmtTime(time) {
    return Math.round(time) + 'ms';
}

var printTypes = [
    'date',
    'regexp',
    'boolean',
    'number',
    'undefined',
    'null'
];

function fmtString(value, limitish) {
    var str = String(value);
    var trimmed = false;
    var t = typeDetect(value);

    if (printTypes.indexOf(t) > -1) {
        return str;
    }
    if (t === 'function') {
        return t;
    }
    if (arguments.length > 2) {
        // limit is not 100% accurate as it doesn't take escaping into account
        if (str.length > limitish) {
            str = str.substr(0, limitish);
            trimmed = true;
        }
    }
    return escapeString(str) + (trimmed ? '...' : '');
}

function fmtDiff(actual, expected, operator, indent) {
    // simplify
    var aDet = typeDetect(actual);
    var eDet = typeDetect(expected);
    if (aDet === 'date' || aDet === 'regexp') {
        actual = String(actual);
    }
    if (eDet === 'date' || eDet === 'regexp') {
        actual = String(actual);
    }

    // simple type
    var acType = typeof actual;
    var exType = typeof expected;

    var diff = '';
    if ((acType === 'string' && exType === 'string') || (acType && exType && acType === 'object' && exType === 'object')) {
        diff = formatter.getStyledDiff(actual, expected, indent);
    }
    else {
        diff = indent + '  want: ' + fmtString(actual, valueStrLim) + '\n' + indent + '  have: ' + fmtString(expected, valueStrLim);
    }
    return diff;
}

var propMap = Object.create(null);
propMap['wanted'] = 'expected';
propMap['found'] = 'actual';

var literalMap = Object.create(null);
literalMap['true'] = true;
literalMap['false'] = false;
literalMap['undefined'] = undefined;
literalMap['null'] = null;
literalMap['NaN'] = NaN;

var evalExp = [
    /^'.*?'$/,
    /^\[.*?\]$/,
    /^\{.*?\}$/,
    /^\/.*?\/[a-z]*$/
];

function evil(str) {
    var tmp;
    eval('tmp = ' + str + ';');
    return tmp;
}

function parseValue(str) {
    var value = parseFloat(str);
    if (!isNaN(value)) {
        return value;
    }
    if (str in literalMap) {
        return literalMap[str];
    }
    for (var i = 0; i < evalExp.length; i++) {
        if (evalExp[i].test(str)) {
            return evil(str);
        }
    }
    return str;
}

var result;
var errors = [];
var tests = [];

var current;
var currentAssert;

var extraOpen = false;
var yam;

function Test(name) {
    this.name = name;
    this.startTime = Date.now();
    this.endTime = 0;
    this.duration = 0;
    this.asserts = [];
    this.ok = true;

    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.total = 0;
}

function closeCurrent() {
    if (current) {
        current.endTime = Date.now();
        current.duration = current.endTime - current.startTime;
        current = null;
        currentAssert = null;
    }
}

tap.on('version', function (version) {
    writeln(style.accent('TAP version ' + version));
    writeln();
});

tap.on('comment', function (comment) {
    // all of these end a test (right?)
    closeCurrent();

    // writeln();
    if (/^tests\s+[1-9]/gi.test(comment)) {
        // writeln(style.accent(comment));
    }
    else if (/^pass\s+[1-9]/gi.test(comment)) {
        // writeln(style.success(comment));
    }
    else if (/^fail\s+[1-9]/gi.test(comment)) {
        // writeln(style.error(comment));
    }
    else if (/^ok$/gi.test(comment)) {
        // writeln(style.plain(comment));
    }
    else {
        current = new Test(comment);
        tests.push(current);
        currentAssert = null;
    }
});

tap.on('assert', function (assert) {
    currentAssert = assert;
    current.ok = (current.ok && assert.ok);
    current.asserts.push(assert);
    current.total++;

    if (assert.ok) {
        current.passed++;
        addDot(goodDot);
    }
    else {
        current.failed++;
        addDot(badDot);
    }
});

tap.on('plan', function (plan) {
    // writeln('plan' + util.inspect(plan));
});

tap.on('extra', function (extra) {
    // writeln(extra);
    if (!extraOpen) {
        if (/^  ---$/.test(extra)) {
            extraOpen = true;
            yam = [];
        }
    }
    else if (/^  \.\.\.$/.test(extra)) {
        extraOpen = false;
        if (yam.length > 0) {
            // pad yamlish with newlines
            var obj = yamlish.decode('\n' + yam.join('\n') + '\n');
            if (obj && typeof obj === 'object') {
                Object.keys(obj).forEach(function (key) {
                    var prop = key;
                    // remap fields (ex: tap)
                    if (prop in propMap) {
                        prop = propMap[prop];
                    }
                    // parse tape objects
                    if (key === 'actual' || key === 'expected') {
                        currentAssert[prop] = parseValue(obj[key]);
                    }
                    else {
                        currentAssert[prop] = obj[key];
                    }
                });
            }
        }
    }
    else {
        extra = extra.replace(/^    /, '').replace(/ +$/, '');
        if (extra.length > 0) {
            yam.push(extra);
        }
    }
});

function printTestTotal(count) {
    writeln(style.accent('executed ' + count.testsTotal + ' ' + plural('test', count.testsFailed)));

    if (count.testsPassed === 0) {
        writeln(style.warning('  passed 0'));
    }
    else {
        if (count.assertsFailed === 0) {
            writeln(style.success('  passed ' + count.testsPassed));
        }
        else {
            writeln(style.warning('  passed ' + count.testsPassed));
        }
    }
    if (count.testsFailed === 0) {
        writeln(style.success('  failed 0'));
    }
    else {
        writeln(style.error('  failed ' + count.testsFailed));
    }

    writeln('  timing ' + fmtTime(count.duration));
}

function printAssertTotal(count) {
    writeln(style.accent('asserted ' + count.assertTotal));

    if (count.assertPassed === 0) {
        writeln(style.warning('  passed 0'));
    }
    else {
        if (count.assertsFailed === 0) {
            writeln(style.success('  passed ' + count.assertPassed));
        }
        else {
            writeln(style.warning('  passed ' + count.assertPassed));
        }
    }
    if (count.assertsFailed === 0) {
        writeln(style.success('  failed 0'));
    }
    else {
        writeln(style.error('  failed ' + count.assertsFailed));
    }

    writeln('  timing ' + fmtTime(count.avgDuration));
}

function printFailedTests(tests) {
    tests.forEach(function (test) {
        if (test.ok) {
            return;
        }
        writeln('  ' + style.accent(test.name));


        test.asserts.forEach(function (assert, i) {
            if (assert.ok) {
                return;
            }

            writeln('    ' + style.warning(assert.number + ') ' + assert.name));

            // position info passed by tap is bad (points to internals?)
            /*
            var pos = fmtPosition(assert);
            if (pos) {
                writeln('      ' + style.muted('@' + pos));
            }
            */

            var diff = fmtDiff(assert.actual, assert.expected, assert.operator, '      ');
            if (diff) {
                writeln(diff, '      ');
            }
            if (i < test.length - 1) {
                writeln();
            }
        });
    });
}

tap.on('results', function (res) {
    result = res;

    closeCurrent();

    // writeln(util.inspect(result));
    // writeln(util.inspect(tests, false, 8));

    var count = {
        testsTotal: tests.length,
        testsPassed: 0,
        testsFailed: 0,

        assertTotal: 0,
        assertPassed: 0,
        assertsFailed: 0,
        duration: 0,
        avgDuration: 0
    };

    tests.forEach(function (test) {
        if (test.ok) {
            count.testsPassed++;
        }
        else {
            count.testsFailed++;
        }
        count.assertTotal += test.total;
        count.assertPassed += test.passed;
        count.assertsFailed += test.failed;
        count.duration += test.duration;
    });

    count.avgDuration = Math.round(count.duration / count.testsTotal);

    if (count.assertTotal === 0) {
        writeln(style.signal('zero tests?'));
        writeln();
    }
    else {
        writeln();
        writeln();

        if (count.testsFailed > 0) {
            writeln(style.signal('failed ' + count.testsFailed + ' ' + plural('test', count.testsFailed)));
            writeln();
            printFailedTests(tests);
            writeln();
        }

        printAssertTotal(count);

        writeln();
        printTestTotal(count);

        writeln();
        // writeln('duration ' + fmtTime(count.duration) + ', average ' + fmtTime(count.avgDuration));
        // writeln();
    }
});

process.on('exit', function () {
    if (errors.length || !result.ok) {
        writeln(style.signal('fail'));
        process.exit(1);
    }
    else {
        writeln(style.accent('pass'));
    }
});
