"use strict";
const immutable = require('immutable');
const mori = require('mori');
const pvec = require("../../lib/index");
const api = require('../shared');

module.exports = {
    name: 'Get Nth',
    description: "Cost to get the `nth` entry in a map of size `n`.",
    sizes: [10, 100, 1000, 10000, 100000],
    benchmarks: {},
};

module.exports.benchmarks['Native array'] = keys => {
    const h = api.nativeArrayFrom(keys);
    return function() {
        const key = Math.floor(Math.random() * keys.length);
        h[key];
    };
};

module.exports.benchmarks['Immutable'] = keys => {
    const h = api.immutableFrom(keys);
    return function() {
        const key = Math.floor(Math.random() * keys.length);
        h.get(key);
    };
};

module.exports.benchmarks['Mori'] = keys => {
    const h = api.moriFrom(keys);
    return function() {
        const key = Math.floor(Math.random() * keys.length);
        mori.nth(h,key);
    };
};

module.exports.benchmarks['PVec'] = keys => {
    const h = api.pvecFrom(keys);
    return function() {
        const key = Math.floor(Math.random() * keys.length);
        h.get(key);
    };
};
