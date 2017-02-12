"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.TVec = exports.PVec = exports.empty = undefined;
exports.isPVec = isPVec;

var _pvec = require("./pvec");

var _tvec = require("./tvec");

var _shared = require("./shared");

_tvec.TVec.prototype.asPersistent = function () {
    this.id = null;
    return new _pvec.PVec(this.origin, this.capacity, this.shift, this.root, this.compressedTail());
};
_pvec.PVec.prototype.asTransient = function () {
    return new _tvec.TVec(this.origin, this.capacity, this.shift, this.root, this.tail);
};

_pvec.PVec.prototype.concat = function (other) {
    return this.asTransient().concat(other).asPersistent();
};

_pvec.PVec.prototype.slice = function (begin, end) {
    return this.asTransient().slice(begin, end).asPersistent();
};

_pvec.PVec.prototype[Symbol.iterator] = _tvec.TVec.prototype[Symbol.iterator] = _pvec.PVec.prototype.values = _tvec.TVec.prototype.values = function () {
    return (0, _shared.values)(this);
};

_pvec.PVec.prototype.entries = _tvec.TVec.prototype.entries = function () {
    return (0, _shared.entries)(this);
};

const empty = exports.empty = new _pvec.PVec();
function isPVec(vec) {
    return !!vec && vec.__isVec_Sentinel;
}
exports.PVec = _pvec.PVec;
exports.TVec = _tvec.TVec;