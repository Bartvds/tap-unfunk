function run(test) {

    test(function (t) {
        t.plan(1);
        t.equal(1, 2, 'assert foo');
    });

    test('string pass', function (t) {
        t.plan(1);
        t.equal('foo', 'foo', 'assert foo');
        t.equal('bar', 'bar', 'assert bar');
    });

    test('string fail', function (t) {
        t.plan(1);
        t.equal('foobar', 'baz', 'assert foobar');
    });

    test('mix fail', function (t) {
        t.plan(1);
        t.equal(123, 'baz', 'assert 123');
    });

    test('mix fail', function (t) {
        t.plan(1);
        t.equal(123, 'bu\'z\nz', 'assert 123');
    });

    test('string sub pass', function (t) {
        t.plan(1);
        t.equal('hoge', 'hoge');
        t.test('sub pass', function (t) {
            t.plan(1);
            t.equal('hoge', 'hoge');
        });
    });

    test('string sub fail', function (t) {
        t.plan(1);
        t.equal('hoge', 'hoge');
        t.test('sub fail', function (t) {
            t.plan(1);
            t.equal('hoge', 'nuge');
        });
    });

    test('boolean pass', function (t) {
        t.plan(1);
        t.equal(true, true);
    });

    test('boolean fail', function (t) {
        t.plan(1);
        t.equal(true, false);
    });

    test('array pass', function (t) {
        t.plan(1);
        t.deepEqual([0, 1, 2], [0, 1, 2]);
    });

    test('array fail', function (t) {
        t.plan(1);
        t.deepEqual([0, 1, 2], [0, 3, 2]);
    });

    test('object pass', function (t) {
        t.plan(1);
        t.deepEqual({
            aa: 'aabb',
            bb: 22,
            cc: [0, 1, 2]
        }, {
            aa: 'aa',
            bb: 22,
            cc: [0, 1, 2]
        });
    });

    test('object fail', function (t) {
        t.plan(1);
        t.deepEqual({
            aa: 'aabb',
            bb: 22,
            cc: [0, 1, 2],
            dd: 12
        }, {
            aa: 'abcb',
            bb: 22,
            cc: [0, 1, 3],
            dd: 'dd'
        });
    });
}

module.exports = run;
