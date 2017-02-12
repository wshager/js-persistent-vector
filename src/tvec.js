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
import { BITS, BRANCHING, MASK } from "./const";
import * as shared from "./shared";

export function TVec(origin = 0, capacity = 0, shift = 0, root = null, tail = null) {
    this.id = newId();
    this.origin = origin;
    this.capacity = capacity;
    this.size = capacity - origin;
    this.shift = shift || 0;
    this.root = root || null;
    this.tail = tail ? expandNode(tail, this.id) : newNode();
}

TVec.isVec = function(vec){
    return !!vec && vec.__isVec_Sentinel;
};

TVec.prototype.__isVec_Sentinel = true;

// public interface
TVec.prototype.get = function(i){
    return shared.get(this,i);
};

TVec.prototype.set = function(i,val){
    return shared.set(this,i,val,update,updateTail,ensureEditable);
};

TVec.prototype.push = function (val) {
    return shared.push(this,val,update,updateTail,createTail,reShift,newNode,ensureEditable);
};

TVec.prototype.pop = function(){
    return shared.pop(this,update,popTail,ensureEditable);
};

TVec.prototype.slice = function(begin,end){
    return slice(this,begin,end);
};

TVec.prototype.concat = function(other){
    return concat(this,other);
};

TVec.prototype.toString = function() {
    let str = "TVec [";
    for (let j of this.iter()) str += j + ", ";
    str += "]";
    return str;
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

function expandNode(node, id) {
    var expanded = arrCopy(node);
    expanded[BRANCHING] = id;
    return expanded;
}

// no way around it
function concat(vec,other){
    var size = vec.size;
    var end = other.size;
    for(var i=0;i<end;i++){
        vec = vec.set(i+size,other.get(i));
    }
    return vec;
}

function slice(vec, begin, end) {
  var size = vec.size;
  if (wholeSlice(begin, end, size)) {
    return vec;
  }
  for(var x of vec){

  }
  return setListBounds(
    vec,
    resolveIndex(begin, size, 0),
    resolveIndex(end, size, size)
  );
}

function wholeSlice(begin, end, size) {
  return (begin === 0 || (size !== undefined && begin <= -size)) &&
    (end === undefined || (size !== undefined && end >= size));
}

function resolveIndex(index, size, defaultIndex) {
  return index === undefined ?
    defaultIndex :
    index < 0 ?
      Math.max(0, size + index) :
      size === undefined ?
        index :
        Math.min(size, index);
}

function setListBounds(vec, begin, end) {
  // Sanitize begin & end using this shorthand for ToInt32(argument)
  // http://www.ecma-international.org/ecma-262/6.0/#sec-toint32
  if (begin !== undefined) {
    begin = begin | 0;
  }
  if (end !== undefined) {
    end = end | 0;
  }
  var owner = vec.id || newId();
  var oldOrigin = vec.origin;
  var oldCapacity = vec.capacity;
  var newOrigin = oldOrigin + begin;
  var newCapacity = end === undefined ? oldCapacity : end < 0 ? oldCapacity + end : oldOrigin + end;
  if (newOrigin === oldOrigin && newCapacity === oldCapacity) {
    return vec;
  }

  // If it's going to end after it starts, it's empty.
  if (newOrigin >= newCapacity) {
    return vec.clear();
  }

  var newLevel = vec.shift;
  var newRoot = vec.root;

  // New origin might need creating a higher root.
  var offsetShift = 0;
  while (newOrigin + offsetShift < 0) {
    newRoot = ensureEditable(newRoot && newRoot.length ? [undefined, newRoot] : [], owner);
    newLevel += BITS;
    offsetShift += 1 << newLevel;
  }
  if (offsetShift) {
    newOrigin += offsetShift;
    oldOrigin += offsetShift;
    newCapacity += offsetShift;
    oldCapacity += offsetShift;
  }

  var oldTailOffset = shared.tailOffset(oldCapacity);
  var newTailOffset = shared.tailOffset(newCapacity);

  // New size might need creating a higher root.
  while (newTailOffset >= 1 << (newLevel + BITS)) {
    newRoot = ensureEditable(newRoot && newRoot.length ? [newRoot] : [], owner);
    newLevel += BITS;
  }

  // Locate or create the new tail.
  var oldTail = vec.tail;
  var newTail = newTailOffset < oldTailOffset ?
    shared.vecNodeFor(vec, newCapacity - 1) :
    newTailOffset > oldTailOffset ? newNode(owner) : oldTail;

  // Merge Tail into tree.
  if (oldTail && newTailOffset > oldTailOffset && newOrigin < oldCapacity && oldTail.length) {
    newRoot = ensureEditable(newRoot, owner);
    var node = newRoot;
    for (var level = newLevel; level > BITS; level -= BITS) {
      var idx = (oldTailOffset >>> level) & MASK;
      node = node[idx] = ensureEditable(node[idx], owner);
    }
    node[(oldTailOffset >>> BITS) & MASK] = oldTail;
  }

  // If the size has been reduced, there's a chance the tail needs to be trimmed.
  if (newCapacity < oldCapacity) {
    newTail = newTail && removeAfter(newTail,owner, 0, newCapacity);
  }

  // If the new origin is within the tail, then we do not need a root.
  if (newOrigin >= newTailOffset) {
    newOrigin -= newTailOffset;
    newCapacity -= newTailOffset;
    newLevel = BITS;
    newRoot = null;
    newTail = newTail && removeBefore(newTail,owner, 0, newOrigin);

  // Otherwise, if the root has been trimmed, garbage collect.
  } else if (newOrigin > oldOrigin || newTailOffset < oldTailOffset) {
    offsetShift = 0;

    // Identify the new top root node of the subtree of the old root.
    while (newRoot) {
      var beginIndex = (newOrigin >>> newLevel) & MASK;
      if (beginIndex !== (newTailOffset >>> newLevel) & MASK) {
        break;
      }
      if (beginIndex) {
        offsetShift += (1 << newLevel) * beginIndex;
      }
      newLevel -= BITS;
      newRoot = newRoot[beginIndex];
    }

    // Trim the new sides of the new root.
    if (newRoot && newOrigin > oldOrigin) {
      newRoot = removeBefore(newRoot,owner, newLevel, newOrigin - offsetShift);
    }
    if (newRoot && newTailOffset < oldTailOffset) {
      newRoot = removeAfter(newRoot,owner, newLevel, newTailOffset - offsetShift);
    }
    if (offsetShift) {
      newOrigin -= offsetShift;
      newCapacity -= offsetShift;
    }
  }

  return update(vec, newOrigin, newCapacity, newLevel, newRoot, newTail);
}

function removeBefore(node,ownerID, level, index) {
    if (index === level ? 1 << level : 0 || node.length === 0) {
      return node;
    }
    var originIndex = (index >>> level) & MASK;
    if (originIndex >= node.length) {
      return newNode(ownerID);
    }
    var removingFirst = originIndex === 0;
    var newChild;
    if (level > 0) {
      var oldChild = node[originIndex];
      newChild = oldChild && removeBefore(oldChild,ownerID, level - BITS, index);
      if (newChild === oldChild && removingFirst) {
        return node;
      }
    }
    if (removingFirst && !newChild) {
      return node;
    }
    var editable = ensureEditable(node, ownerID);
    if (!removingFirst) {
      for (var ii = 0; ii < originIndex; ii++) {
        editable[ii] = undefined;
      }
    }
    if (newChild) {
      editable[originIndex] = newChild;
    }
    return editable;
}

function removeAfter(node,ownerID, level, index) {
    if (index === (level ? 1 << level : 0) || node.length === 0) {
      return node;
    }
    var sizeIndex = ((index - 1) >>> level) & MASK;
    if (sizeIndex >= node.length) {
      return node;
    }

    var newChild;
    if (level > 0) {
      var oldChild = node[sizeIndex];
      newChild = oldChild && removeAfter(oldChild,ownerID, level - BITS, index);
      if (newChild === oldChild && sizeIndex === node.length - 1) {
        return node;
      }
    }

    var editable = ensureEditable(node, ownerID);
    editable.splice(sizeIndex + 1);
    if (newChild) {
      editable[sizeIndex] = newChild;
    }
    return editable;
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

function newNode(id) {
    var node = new Array(BRANCHING + 1);
    node[BRANCHING] = id;
    return node;
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
