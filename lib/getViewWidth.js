var tty = require('tty');

function getViewWidth(max) {
    var width = 80;
    var isatty = (tty.isatty('1') && tty.isatty('2'));
    if (isatty) {
        width = (process.stdout.getWindowSize ? process.stdout.getWindowSize(1)[0] : tty.getWindowSize()[1]);
    }
    if (arguments.length > 0) {
        width = Math.min(max, width);
    }
    return 80;
}

module.exports = getViewWidth;
