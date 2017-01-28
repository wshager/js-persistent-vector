"use strict";
const immutable = require('immutable');
const clone = require("../clone");
const pvec = require('js-persistent-vector');

module.exports = {
    name: 'Put N',
    description: "Cost to put `n` entries into a map.",
    sizes: [10, 100, 1000, 10000],
    benchmarks: {}
};

module.exports.benchmarks['Native Array'] = keys => {
    let h = [];
    return function() {
        for (let i = 0, len = keys.length; i < len; ++i) {
            const c = clone.copyArr(h);
            c.push(keys[i]);
        }
    };
};

module.exports.benchmarks['Immutable'] = keys => {
    let h = immutable.List();
    return function() {
        for (let i = 0, len = keys.length; i < len; ++i)
            h = h.push(keys[i]);
    };
};

module.exports.benchmarks['PVec'] = keys => {
    let h = pvec.empty;
    return function() {
        for (let i = 0, len = keys.length; i < len; ++i)
            h = h.push(keys[i]);
    };
};
