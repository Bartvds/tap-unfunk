function escapeString(str) {
    return JSON.stringify(str);
}

function unString(str) {
    return JSON.parse(str.replace(/(^')|('$)/g, '"').replace(/\\'/g, '\'').replace(/"/g, '\"'));
}

module.exports = {
    escape: escapeString,
    unString: unString
};
