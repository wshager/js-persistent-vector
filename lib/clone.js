"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.arrCopy = arrCopy;
function arrCopy(arr /*, offset = 0*/) {
  // guarded: var len = Math.max(0, arr.length - offset);
  var len = arr.length; // - offset;
  var newArr = new Array(len);
  for (var i = 0; i < len; i++) {
    newArr[i] = arr[i];
  }
  return newArr;
}