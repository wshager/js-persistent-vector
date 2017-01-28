"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
const BITS = exports.BITS = 5; // SHIFT in immutable.js
const BRANCHING = exports.BRANCHING = 1 << BITS; // SIZE in immutable.js
const MASK = exports.MASK = BRANCHING - 1;
const EMPTY_TAIL = exports.EMPTY_TAIL = [];