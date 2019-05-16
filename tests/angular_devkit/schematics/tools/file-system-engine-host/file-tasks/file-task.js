function default_1() {
    return async () => {
        throw new Error('task exception');
    }
}

exports.default = default_1;