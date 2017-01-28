 "use strict";

 const immutable = require('immutable');
 const pvec = require("js-persistent-vector");
 const clone = require("../clone");
 const api = require('../shared');

module.exports = {
    name: 'Put Nth',
    description: "Cost to put the `nth` entry into a map of size `n - 1`.",
    sizes: [10, 100, 1000, 10000, 100000],
    benchmarks: {}
};

module.exports.benchmarks['Native Array'] = keys => {
    var keys1 = keys.slice(1);
    const h = api.nativeArrayFrom(keys1);
    console.log(h)
    const key = keys1[0];
    const i = Math.floor(Math.random() * keys1.length);
    return function() {
        const c = clone.copyArr(h);
        c[i] = key;
    };
};

module.exports.benchmarks['Immutable'] = keys => {
    var keys1 = keys.slice(1);
    const h = api.immutableFrom(keys1);
    const key = keys1[0];
    const i = Math.floor(Math.random() * keys1.length);
    return function() {
        h.set(i,key);
    };
};

module.exports.benchmarks['PVec'] = keys => {
    var keys1 = keys.slice(1);
    const h = api.pvecFrom(keys1);
    const key = keys1[0];
    const i = Math.floor(Math.random() * keys1.length);
    return function() {
        h.set(i,key);
    };
};
