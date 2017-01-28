"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.TVec = exports.PVec = exports.empty = undefined;
exports.isPVec = isPVec;

var _pvec = require("./pvec");

var _tvec = require("./tvec");

_tvec.TVec.prototype.asPersistent = function () {
	this.id = null;
	return new _pvec.PVec(this.size, this.shift, this.root, this.compressedTail());
};
_pvec.PVec.prototype.asTransient = function () {
	return new _tvec.TVec(this.size, this.shift, this.root, this.tail);
};

const empty = exports.empty = new _pvec.PVec();
function isPVec(vec) {
	return !!vec && vec.__isVec_Sentinel;
}
exports.PVec = _pvec.PVec;
exports.TVec = _tvec.TVec;