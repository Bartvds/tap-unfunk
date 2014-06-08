var through = require('through2');
var parser = require('tap-parser');
var duplexer = require('duplexer');
var yamlish = require('yamlish');
var util = require('util');

var out = through();
var tap = parser();
var dup = duplexer(tap, out);

process.stdin
    .pipe(dup)
    .pipe(process.stdout);

function writeln(line) {
    if (arguments.length > 0) {
        out.push(line);
    }
    out.push('\n');
}

out.push('wow');
out.push('\n');
out.push('\n');

tap.on('version', function (version) {
    out.push('-> version ');
    out.push(util.inspect(version));
    out.push('\n');
});

function Test(name) {
    this.name = name;
    this.asserts = [];
}

var literal = Object.create(null);
literal['true'] = true;
literal['false'] = false;
literal['undefined'] = undefined;
literal['null'] = null;
literal['NaN'] = NaN;

var evalExp = [
    /^\[.*?\]$/,
    /^\{.*?\}$/,
    // /^\/.*?\/[a-z]+$/
];

var propMap = Object.create(null);
propMap['wanted'] = 'expected';
propMap['found'] = 'actual';

function evil(str) {
    var tmp;
    eval('tmp = ' + str + ';');
    return tmp;
}

function getValue(str) {
    var value = parseFloat(str);
    if (!isNaN(value)) {
        return value;
    }
    if (str in literal) {
        return literal[str];
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
var current = {};
var currentAssert = {};

tap.on('comment', function (comment) {
    out.push('\n');
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
        writeln('-> test ' + comment);
        current = new Test(comment);
        tests.push(current);
        currentAssert = null;
    }
});

tap.on('assert', function (assert) {
    out.push('-> assert ');
    writeln(util.inspect(assert));
    currentAssert = assert;
    current.asserts.push(assert);
});

tap.on('plan', function (plan) {
    out.push('-> plan ');
    writeln(util.inspect(plan));
});

var extraOpen = false;
var stackOpen = false;
var yam;

tap.on('extra', function (extra) {
    writeln('-> extra');
    writeln(extra);
    if (!extraOpen) {
        if (/^  ---$/.test(extra)) {
            extraOpen = true;
            yam = [];
            writeln('--> open');
        }
    }
    else if (/^  \.\.\.$/.test(extra)) {
        writeln('--> close');
        extraOpen = false;
        if (yam.length > 0) {
            var obj = yamlish.decode(yam.join('\n'));            
            Object.keys(obj).forEach(function(prop) {
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
        extra = extra.replace(/^    /, '').trim();
        if (/^\w+:/.test(extra)) {
            var match = /^(\w+):\s*(.*?)\s*$/.exec(extra);
            var prop = match[1];
            if (prop === 'actual' || prop === 'expected') {
                currentAssert[prop] = getValue(match[2]);
                return;
            }
        }
        else if (extra.length > 0) {
            yam.push(extra);
        }
    }
});

tap.on('results', function (res) {
    result = res;
    writeln();
    writeln(util.inspect(tests, false, 8));
    out.push('-> result ');
    // out.push(util.inspect(result));
    writeln();
});

process.on('exit', function () {
    if (errors.length || !result.ok) {
        process.exit(1);
    }
});
