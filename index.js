var util = require('util');

var through = require('through2');
var duplexer = require('duplexer');

var parser = require('tap-parser');
var yamlish = require('yamlish');
var tty = require('tty');
var isatty = (tty.isatty('1') && tty.isatty('2'));

var style = require('ministyle').ansi();

function getViewWidth(max) {
    var width = 80;
    if (isatty) {
        width = (process.stdout.getWindowSize ? process.stdout.getWindowSize(1)[0] : tty.getWindowSize()[1]);
    }
    if (arguments.length > 0) {
        width = Math.min(max, width);
    }
    return 80;
}

var viewWidth = getViewWidth() - 2;
var dotLimit = getViewWidth(80) - 2 - 2;
var dotCount = 0;

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

var out = through();
var tap = parser();
var dup = duplexer(tap, out);

process.stdin
    .pipe(dup)
    .pipe(process.stdout);

function write(line) {
    out.push(line);
}

function writeln(line) {
    if (arguments.length > 0) {
        out.push(line);
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

var propMap = Object.create(null);
propMap['wanted'] = 'expected';
propMap['found'] = 'actual';

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
                Object.keys(obj).forEach(function (prop) {
                    if (prop in propMap) {
                        currentAssert[propMap[prop]] = obj[prop];
                    }
                    else {
                        currentAssert[prop] = obj[prop];
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
        writeln(style.success('  passed ' + count.testsPassed));
    }
    if (count.testsFailed === 0) {
        writeln(style.success('  failed 0'));
    }
    else {
        writeln(style.error('  failed ' + count.testsFailed));
    }
}

function printAssertTotal(count) {
    writeln(style.accent('asserted ' + count.assertTotal));

    if (count.assertPassed === 0) {
        writeln(style.warning('  passed 0'));
    }
    else {
        writeln(style.success('  passed ' + count.assertPassed));
    }
    if (count.assertsFailed === 0) {
        writeln(style.success('  failed 0'));
    }
    else {
        writeln(style.error('  failed ' + count.assertsFailed));
    }
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

            // position info in tap is broken (points to internals?)
            /*
             var pos = fmtPosition(assert);
             if (pos) {
             writeln('      ' + style.muted('@' + pos));
             }
             */

            var diff = formatter.getStyledDiff(assert.actual, assert.expected, '      ');
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
        printTestTotal(count);

        writeln();
        printAssertTotal(count);
        writeln();

        writeln('total duration ' + fmtTime(count.duration) + ' (average ' + fmtTime(count.avgDuration) + ')');
        writeln();
    }
});

process.on('exit', function () {
    if (errors.length || !result.ok) {
        writeln(style.signal('see you soon '));
        process.exit(1);
    }
    else {
        writeln(style.accent('bye'));
    }
});
