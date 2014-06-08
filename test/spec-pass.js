function run(test) {
    for (var i = 0; i < 300; i++) {
        test('test' + i, function (t) {
            t.plan(1);
            setTimeout(function () {
                t.equal(1, 1, 'assert');
            }, 5);
        });
    }
}

module.exports = run;
