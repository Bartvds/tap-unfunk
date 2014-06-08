var util = require('util');

var through = require('through2');
var duplexer = require('duplexer');

var parser = require('tap-parser');
var yamlish = require('yamlish');
var tty = require('tty');
var isatty = (tty.isatty('1') && tty.isatty('2'));

var style = require('ministyle').ansi();

function getViewWidth() {
    if (isatty) {
        return (process.stdout.getWindowSize ? process.stdout.getWindowSize(1)[0] : tty.getWindowSize()[1]);
    }
    return 80;
}

var DiffFormatter = require('unfunk-diff').DiffFormatter;
var formatter = new DiffFormatter(style, getViewWidth());

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

function Test(name) {
    this.name = name;
    this.asserts = [];
    this.ok = true;
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.total = 0;
}

var literalMap = Object.create(null);
literalMap['true'] = true;
literalMap['false'] = false;
literalMap['undefined'] = undefined;
literalMap['null'] = null;
literalMap['NaN'] = NaN;

var evalExp = [
    /^\[.*?\]$/,
    /^\{.*?\}$/,
    /^\/.*?\/[a-z]+$/
];

var propMap = Object.create(null);
propMap['wanted'] = 'expected';
propMap['found'] = 'actual';

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

function fmtPosition(assert) {
    var str = '';
    if (assert.file) {
        str = assert.file;
        if (typeof assert.line !== 'undefined' && typeof assert.column != 'undefined') {
            str += ' [' + assert.line + ',' + assert.column + ']';
        }
    }
    return str;
}

function evil(str) {
    var tmp;
    eval('tmp = ' + str + ';');
    return tmp;
}

var result;
var errors = [];
var tests = [];

var current;
var currentAssert;

var extraOpen = false;
var yam;

tap.on('version', function (version) {
    writeln(style.accent('TAP version ' + version));
});

tap.on('comment', function (comment) {
    // writeln();
    if (/^tests\s+[1-9]/gi.test(comment)) {
        writeln('-> test-count ' + comment);
    }
    else if (/^pass\s+[1-9]/gi.test(comment)) {
        writeln('-> pass ' + comment);
    }
    else if (/^fail\s+[1-9]/gi.test(comment)) {
        writeln('-> fail ' + comment);
    }
    else if (/^ok$/gi.test(comment)) {
        writeln('-> ok ' + comment);
    }
    else {
        // writeln('-> test ' + comment);
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
    }
    else {
        current.failed++;
    }
});

tap.on('plan', function (plan) {
    out.push('-> plan ');
    writeln(util.inspect(plan));
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
            var obj = yamlish.decode(yam.join('\n'));
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
    else if (/^    /.test(extra)) {
        extra = extra.replace(/^    /, '');
        if (/^\w+:/.test(extra)) {
            var match = /^(\w+):\s*(.*?)\s*$/.exec(extra);
            var prop = match[1];
            if (prop === 'actual' || prop === 'expected') {
                currentAssert[prop] = parseValue(match[2]);
                return;
            }
        }
        if (extra.length > 0) {
            yam.push(extra);
        }
    }
});

tap.on('results', function (res) {
    result = res;
    writeln();
    writeln('-> result ');
    writeln();
    // writeln(util.inspect(result));
    // writeln(util.inspect(tests, false, 8));

    var passedTests = 0;
    var failedTests = 0;

    tests.forEach(function (test) {
        if (test.ok) {
            passedTests++;
        }
        else {
            failedTests++;
        }
    });

    if (tests.length === 0) {
        writeln(style.signal('zero tests'));
    }
    else {
        writeln(style.accent('tested ' + tests.length));

        if (passedTests === 0) {
            writeln(style.warning('  passed 0'));
        }
        else {
            writeln(style.success('  passed ' + passedTests));
        }
        if (failedTests === 0) {
            writeln(style.success('  failed 0'));
        }
        else {
            writeln(style.error('  failed ' + failedTests));
        }
        writeln();
    }

    tests.forEach(function (test) {
        if (test.ok) {
            return;
        }
        writeln('  ' + style.accent(test.name));


        test.asserts.forEach(function (assert) {
            if (assert.ok) {
                return;
            }

            write('    ' + style.warning(assert.number + ') ' + assert.name));

            var pos = fmtPosition(assert);
            if (pos) {
                writeln(' ' + style.muted(pos));
            }
            else {
                writeln();
            }

            var diff = formatter.getStyledDiff(assert.actual, assert.expected, '      ');
            if (diff) {
                writeln(diff, '      ');
            }
            writeln();
        });
    });
});

process.on('exit', function () {
    if (errors.length || !result.ok) {
        writeln(style.signal('see you soon!'));
        process.exit(1);
    }
    else {
        writeln(style.success('bye!'));
        writeln();
    }
});
