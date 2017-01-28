"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PVec = PVec;

var _clone = require("./clone");

var _const = require("./const");

var _shared = require("./shared");

var shared = _interopRequireWildcard(_shared);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function PVec(origin = 0, capacity = 0, shift = 0, root = null, tail = _const.EMPTY_TAIL) {
    this.origin = origin;
    this.capacity = capacity;
    this.size = capacity - origin;
    this.shift = shift;
    this.root = root;
    this.tail = tail;
} /*
   * The MIT License
   *
   *  Copyright (c) 2016 Ionut Balcau
   *
   *  Permission is hereby granted, free of charge, to any person obtaining a copy
   *  of this software and associated documentation files (the "Software"), to deal
   *  in the Software without restriction, including without limitation the rights
   *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   *  copies of the Software, and to permit persons to whom the Software is
   *  furnished to do so, subject to the following conditions:
   *
   *  The above copyright notice and this permission notice shall be included in
   *  all copies or substantial portions of the Software.
   *
   *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   *  THE SOFTWARE.
   */

PVec.prototype.__isVec_Sentinel = true;

// public interface
PVec.prototype.get = function (i) {
    return shared.get(this, i);
};

PVec.prototype.set = function (i, val) {
    return shared.set(this, i, val, update, updateTail, _clone.arrCopy);
};

PVec.prototype.push = function (val) {
    return shared.push(this, val, update, updateTail, createTail, reShift, newTop, _clone.arrCopy);
};

PVec.prototype.pop = function () {
    return shared.pop(this, update, popTail, _clone.arrCopy);
};

PVec.prototype.iter = function () {
    return shared.iter(this);
};

PVec.prototype.slice = function (begin, end) {
    return shared.slice(this, begin, end, update);
};

function reShift(vec) {
    return 0;
}

function updateTail(vec, ts, val) {
    let newTail = (0, _clone.arrCopy)(vec.tail);
    newTail[ts] = val;
    return newTail;
}

function createTail(val, id) {
    return [val];
}

function update(vec, origin, capacity, shift, root, tail) {
    return new PVec(origin, capacity, shift, root, tail);
}

function popTail(vec) {
    var newTail = (0, _clone.arrCopy)(vec.tail);
    newTail.pop();
    return newTail;
}

function newTop() {
    return new Array(_const.BRANCHING);
}