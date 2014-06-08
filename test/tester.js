var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

var BufferList = require('bl');
var ministyle = require('ministyle');

function normalise(str) {
    return str.replace(/^  timing \d+ms$/gm, '  timing <X>ms');
}

var style = ministyle.ansi();

var reportPath = path.relative(process.cwd(), path.resolve(__dirname, '..', 'bin', 'unfunk.js'));

var suite = [
    {
        runner: 'tap',
        script: 'tap-fail.js',
        expected: 'tap-fail-expect.txt',
        code: 1
    },
    {
        runner: 'tape',
        script: 'tape-fail.js',
        expected: 'tape-fail-expect.txt',
        code: 1
    },
    {
        runner: 'tap',
        script: 'tap-pass.js',
        expected: 'tap-pass-expect.txt',
        code: 0
    },
    {
        runner: 'tape',
        script: 'tape-pass.js',
        expected: 'tape-pass-expect.txt',
        code: 0
    }
];

var queue = suite.slice(0);
var result = [];

function step(callback) {
    if (queue.length === 0) {
        callback(null, result);
        return;
    }
    var test = queue.shift();

    var scriptPath = path.relative(process.cwd(), path.resolve(__dirname, test.script));
    var expectedPath = path.relative(process.cwd(), path.resolve(__dirname, test.expected));

    console.log('--> running ' + scriptPath);
    console.log('');

    var bl = new BufferList();

    var tapArgs = [scriptPath];
    var tap = child_process.spawn('node', tapArgs);

    var reportArgs = [reportPath];
    var report = child_process.spawn('node', reportArgs);

    tap.stdout.on('data', function (data) {
        report.stdin.write(data);
    });

    report.stdout.on('data', function (data) {
        bl.append(data);
        process.stdout.write(data);
    });

    tap.on('close', function (code) {
        // ignore code
        report.stdin.end();
    });

    report.on('close', function (code) {
        console.log('');
        console.log('');
        console.log('--> done');
        console.log('');
        fs.readFile(expectedPath, 'utf8', function (err, expected) {
            var actual = normalise(bl.toString('utf8'));
            var expected = (expected ? normalise(expected) : '');
            var success = (!err && (actual === expected) && (code === test.code));
            var res = {
                script: scriptPath,
                err: err,
                test: test,
                code: code,
                sucess: success
            };
            /*if (!success) {
                res.actual = actual;
                res.expected = expected;
            }*/
            result.push(res);

            fs.writeFileSync(expectedPath.replace(/-\w+\.txt$/, '-dump.txt'), actual);

            step(callback);
        });
    });
}

step(function (err, result) {
    if (err) {
        console.log(err);
        process.exit(2);
        return;
    }
    var passed = 0;
    var failed = 0;

    result.forEach(function (res) {
        if (res.sucess) {
            console.log(style.success('passed ') + res.script);
            passed++;
            return;
        }
        failed++;

        console.log(style.error('failed ') + res.script);

        if (res.err) {
            console.log(res.err);
            return;
        }
    });

    console.log('');
    console.log('tested ' + result.length + ' passed ' + passed + ' failed ' + failed);
    console.log('');

    var success = (passed > 0 && failed === 0);
    if (!success) {
        process.exit(1);
    }
});
