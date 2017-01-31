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

export function TVec(origin = 0, capacity = 0, shift = 0, root = null, tail = null) {
    this.id = newId();
    this.origin = origin;
    this.capacity = capacity;
    this.size = capacity - origin;
    this.shift = shift || 0;
    this.root = root || null;
    this.tail = tail ? expandNode(tail, this.id) : newNode();
    this.__isVec_Sentinel = true;
}

// public interface
TVec.prototype.get = function(i){
    return shared.get(this,i);
};

TVec.prototype.set = function(i,val){
    return shared.set(this,i,val,update,updateTail,ensureEditable);
};

TVec.prototype.push = function (val) {
    return shared.push(this,val,update,updateTail,createTail,reShift,newTop,ensureEditable);
};

TVec.prototype.pop = function(){
    return shared.pop(this,update,popTail,ensureEditable);
};

TVec.prototype.iter = function(){
    return shared.iter(this);
};

TVec.prototype.slice = function(begin,end){
    return shared.slice(this,begin,end,update);
};

function reShift(vec){
    return vec.shift;
}

function updateTail(vec,ts,val) {
    vec.tail[ts] = val;
    return vec.tail;
}

function createTail(val,id) {
    let newTail = newNode(id);
    newTail[0] = val;
    return newTail;
}

function update(vec,origin,capacity,shift,root,tail){
    vec.origin = origin;
    vec.capacity = capacity;
    vec.size = capacity - origin;
    vec.shift = shift;
    vec.root = root;
    vec.tail = tail;
    return vec;
}

function popTail(vec){
    return vec.tail;
}

TVec.prototype.compressedTail = function () {
    var ts = shared.tailSize(this);
    var compressed = new Array(ts);
    var i = ts;
    while(i--) {
        compressed[i] = this.tail[i];
    }
    return compressed;
};

function newNode(id) {
    var node = new Array(BRANCHING + 1);
    node[BRANCHING] = id;
    return node;
}

function newTop(id){
    return newNode(id);
}

function expandNode(node, id) {
    var expanded = arrCopy(node);
    expanded[BRANCHING] = id;
    return expanded;
}

function ensureEditable(node, id) {
    if (node[BRANCHING] == id) {
        return node;
    }
    else {
        return expandNode(node, id);
    }
}

function newId() {
    return {};
}
