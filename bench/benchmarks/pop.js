"use strict";
const immutable = require('immutable');
const pvec = require("js-persistent-vector");
const clone = require("../clone");
const api = require('../shared');

module.exports = {
    name: 'Pop',
    description: "Cost to get the `nth` entry in a map of size `n`.",
    sizes: [10, 100, 1000, 10000, 100000],
    benchmarks: {},
};

module.exports.benchmarks['Native array'] = keys => {
    const h = api.nativeArrayFrom(keys);
    return function() {
        const c = clone.copyArr(h);
        c.pop();
    };
};

module.exports.benchmarks['Immutable'] = keys => {
    const h = api.immutableFrom(keys);
    return function() {
        h.pop();
    };
};

module.exports.benchmarks['PVec'] = keys => {
    const h = api.pvecFrom(keys);
    return function() {
        const key = Math.floor(Math.random() * keys.length);
        h.pop();
    };
};
