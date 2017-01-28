"use strict";
const immutable = require('immutable');
const clone = require("../../lib/clone");
const pvec = require('../../lib/index');

module.exports = {
    name: 'Slice',
    description: "Cost to put `n` entries into a map.",
    sizes: [10, 100, 1000, 10000],
    benchmarks: {}
};

module.exports.benchmarks['Native Array'] = keys => {
    let h = [];
    return function() {
        for (let i = 0, len = h.length; i < len; ++i) {
            h = h.slice(1);
        }
    };
};

module.exports.benchmarks['Immutable'] = keys => {
    let h = immutable.List();
    return function() {
        for (let i = 0, len = h.size; i < len; ++i)
            h = h.slice(1);
    };
};

module.exports.benchmarks['PVec'] = keys => {
    let h = pvec.empty;
    return function() {
        for (let i = 0, len = h.size; i < len; ++i)
            h = h.slice(1);
    };
};
