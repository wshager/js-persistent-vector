/*
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

import { arrCopy } from "./clone";
import { BITS, BRANCHING, MASK, EMPTY_TAIL } from "./const";
import * as shared from "./shared";

export function PVec(origin=0, capacity=0, shift=0, root=null, tail=EMPTY_TAIL) {
    this.origin = origin;
    this.capacity = capacity;
    this.size =  capacity - origin;
    this.shift = shift;
    this.root = root;
    this.tail = tail;
}

PVec.isVec = function(vec){
    return !!vec && vec.__isVec_Sentinel;
};

PVec.prototype.__isVec_Sentinel = true;

// public interface
PVec.prototype.get = function(i){
    return shared.get(this,i);
};

PVec.prototype.set = function(i,val){
    return shared.set(this,i,val,update,updateTail,arrCopy);
};

PVec.prototype.push = function(val) {
    return shared.push(this,val,update,updateTail,createTail,reShift,newTop,arrCopy);
};

PVec.prototype.pop = function () {
    return shared.pop(this,update,popTail,arrCopy);
};

PVec.prototype.toString = function() {
    let str = "PVec [";
    for (let j of this.iter()) str += j + ", ";
    str += "]";
    return str;
};

function reShift(vec){
    return 0;
}

function updateTail(vec,ts,val) {
    let newTail = arrCopy(vec.tail);
    newTail[ts] = val;
    return newTail;
}

function createTail(val,id) {
    return [val];
}

function update(vec,origin,capacity,shift,root,tail) {
    return new PVec(origin,capacity,shift,root,tail);
}

function popTail(vec){
    var newTail = arrCopy(vec.tail);
    newTail.pop();
    return newTail;
}

function newTop(){
    return new Array(BRANCHING);
}
