var immutable = require('immutable');
var mori = require('mori');
var pvec = require("../lib/index");

exports.nativeArrayFrom = function(keys) {
    return keys.reduce(function(map, val, index) {
        map[val] = index;
        return map;
    }, []);
};

exports.immutableFrom = function(keys) {
    var h = immutable.List();
    for (var i = 0; i < keys.length; ++i)
        h = h.push(keys[i]);
    return h;
};

exports.moriFrom = function(keys){
    var h = mori.vector();
    for (var i = 0; i < keys.length; ++i)
        h = mori.conj(h,keys[i]);
    return h;
};

exports.pvecFrom = function(keys) {
    var h = new pvec.PVec();
    for (var i = 0; i < keys.length; ++i)
        h = h.push(keys[i]);
    return h;
};
