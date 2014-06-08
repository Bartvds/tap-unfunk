var through = require('through2');
var parser = require('tap-parser');
var duplexer = require('duplexer');
var util = require('util');

var out = through();
var tap = parser();
var dup = duplexer(tap, out);

var stack = [];
var result = [];
var errors = [];

process.stdin
    .pipe(dup)
    .pipe(process.stdout);

out.push('wow');
out.push('\n');
out.push('\n');

tap.on('version', function (version) {
    out.push('-> version ');
    out.push(util.inspect(version));
    out.push('\n');
});

tap.on('comment', function (comment) {
    out.push('\n');
    if (/^tests\s+[1-9]/gi.test(comment)){
        out.push('-> test-count ' + comment);
    } 
    else if (/^pass\s+[1-9]/gi.test(comment)) {
        out.push('-> pass ' + comment);
    }
    else if (/^fail\s+[1-9]/gi.test(comment)) {
        out.push('-> fail ' + comment);
    }
    else if (/^ok$/gi.test(comment)) {
        out.push('-> ok ' + comment);
    }
    else {
        out.push('-> test ' + comment);
    }
    out.push('\n');
});

tap.on('assert', function (assert) {
    out.push('-> assert ');
    out.push(util.inspect(assert));
    out.push('\n');
});

tap.on('plan', function (plan) {
    out.push('-> plan ');
    out.push(util.inspect(plan));
    out.push('\n');
});

tap.on('results', function (res) {
    result = res;
    out.push('\n');
    out.push('-> result ');
    out.push(util.inspect(result));
    out.push('\n');
});

tap.on('extra', function (extra) {
    out.push('-> extra ');
    out.push(util.inspect(extra));
    out.push('\n');
});

process.on('exit', function () {
    if (errors.length || !result.ok) {
        process.exit(1);
    }
});
