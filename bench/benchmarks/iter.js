"use strict";
const immutable = require('immutable');
const pvec = require("js-persistent-vector");
const api = require('../shared');

module.exports = {
    name: 'Iterate',
    description: "Cost to get the `nth` entry in a map of size `n`.",
    sizes: [10, 100],
    benchmarks: {},
};

module.exports.benchmarks['Native array'] = keys => {
    const h = api.nativeArrayFrom(keys);
    return function() {
        for(var i of h) ""+h;
    };
};

module.exports.benchmarks['Immutable'] = keys => {
    const h = api.immutableFrom(keys);
    return function() {
        for(var i of h) ""+h;
    };
};

module.exports.benchmarks['PVec'] = keys => {
    const h = api.pvecFrom(keys).iter();
    return function() {
        for(var i of h) ""+h;
    };
};
