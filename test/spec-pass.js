function run(test) {
    for (var i = 0; i < 50; i++) {
        test('test' + i, function (t) {
            t.plan(5);
            setTimeout(function () {
                for (var i = 0; i < 5; i++) {
                    t.equal(1, 1, 'assert');
                }
            }, 10);
        });
    }
}

module.exports = run;
