'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tailSize = tailSize;
exports.wrapIndex = wrapIndex;
exports.get = get;
exports.iter = iter;
exports.set = set;
exports.push = push;
exports.pop = pop;
exports.tailOffset = tailOffset;
exports.slice = slice;
exports.wholeSlice = wholeSlice;
exports.resolveBegin = resolveBegin;
exports.resolveEnd = resolveEnd;

var _const = require('./const');

function newPath(levels, tail, newTopFn, id) {
  var topNode = tail;
  for (var level = levels; level > 0; level -= _const.BITS) {
    var newTop = newTopFn(id);
    newTop[0] = topNode;
    topNode = newTop;
  }
  return topNode;
}

function pushLeaf(shift, i, root, tail, copyFn, newTopFn, id) {
  var newRoot = copyFn(root, id);
  var node = newRoot;
  for (var level = shift; level > _const.BITS; level -= _const.BITS) {
    var subidx = i >>> level & _const.MASK;
    var child = node[subidx];
    if (!child) {
      node[subidx] = newPath(level - _const.BITS, tail, newTopFn, id);
      return newRoot;
    }
    child = copyFn(child, id);
    node[subidx] = child;
    node = child;
  }
  node[i >>> _const.BITS & _const.MASK] = tail;
  return newRoot;
}

function tailSize(vec) {
  return !vec.size ? 0 : (vec.size - 1 & _const.MASK) + 1;
}

function wrapIndex(iter, index) {
  // This implements "is array index" which the ECMAString spec defines as:
  //
  //     A String property name P is an array index if and only if
  //     ToString(ToUint32(P)) is equal to P and ToUint32(P) is not equal
  //     to 2^32−1.
  //
  // http://www.ecma-international.org/ecma-262/6.0/#sec-array-exotic-objects
  if (typeof index !== 'number') {
    var uint32Index = index >>> 0; // N >>> 0 is shorthand for ToUint32
    if ('' + uint32Index !== index || uint32Index === 4294967295) {
      return NaN;
    }
    index = uint32Index;
  }
  return index < 0 ? ensureSize(iter) + index : index;
}

function get(vec, i) {
  if (i < vec.size) {
    var node = vecNodeFor(vec, i + vec.origin);
    return node && node[i & _const.MASK];
  }
}

function* iter(vec) {
  for (var i = vec.origin; i < vec.size; i++) {
    yield get(vec, i);
  }
}

function set(vec, i, val, update, updateTail, copyFn) {
  if (i > vec.size) throw new Error("Index out of bounds. Index :" + i + ", Size:" + vec.size);
  if (i == vec.size) return vec.push(val);
  if (i >= tailOffset(vec.size)) {
    return update(vec, vec.origin, vec.capacity, vec.shift, vec.root, updateTail(vec, i & _const.MASK, val));
  } else {
    var newRoot = copyFn(vec.root, vec.id);
    var node = newRoot;
    for (var level = vec.shift; level > 0; level -= _const.BITS) {
      var subidx = i >>> level & _const.MASK;
      var child = node[subidx];
      child = copyFn(child, vec.id);
      node[subidx] = child;
      node = child;
    }
    node[i & _const.MASK] = val;
    return update(vec, vec.origin, vec.capacity, vec.shift, newRoot, vec.tail);
  }
}

function push(vec, val, update, updateTail, createTail, reShift, newTop, copyFn) {
  var ts = tailSize(vec);
  if (ts != _const.BRANCHING) {
    return update(vec, vec.origin, vec.capacity + 1, vec.shift, vec.root, updateTail(vec, ts, val));
  } else {
    // have to insert tail into root.
    let newTail = createTail(val, vec.id);
    // Special case: If old size == BRANCHING, then tail is new root
    if (vec.size == _const.BRANCHING) {
      return update(vec, vec.origin, vec.capacity + 1, reShift(vec), vec.tail, newTail);
    }
    // check if the root is completely filled. Must also increment
    // shift if that's the case.
    if (vec.size >>> _const.BITS > 1 << vec.shift) {
      let newRoot = newTop(vec.id);
      newRoot[0] = vec.root;
      newRoot[1] = newPath(vec.shift, vec.tail, newTop, vec.id);
      return update(vec, vec.origin, vec.capacity + 1, vec.shift + _const.BITS, newRoot, newTail);
    } else {
      // still space in root
      let newRoot = pushLeaf(vec.shift, vec.size - 1, vec.root, vec.tail, copyFn, newTop);
      return update(vec, vec.origin, vec.capacity + 1, vec.shift, newRoot, newTail);
    }
  }
}

function pop(vec, update, popTail, copyFn) {
  if (!vec.size) {
    throw new Error("Vector is already empty");
  }
  if (vec.size == 1) {
    vec.size = 0;
    return vec;
  }
  if ((vec.size - 1 & 31) > 0) {
    return update(vec, vec.origin, vec.capacity - 1, vec.shift, vec.root, popTail(vec));
  } else {
    // has to find new tail
    var newTrieSize = vec.size - _const.BRANCHING - 1;
    // special case: if new size is 32, then new root turns is null, old
    // root the tail
    if (!newTrieSize) {
      return update(vec, 0, _const.BRANCHING, 0, null, vec.root);
    }
    // check if we can reduce the trie's height
    if (newTrieSize == 1 << vec.shift) {
      // can lower the height
      var lowerShift = vec.shift - _const.BITS;
      let newRoot = vec.root[0];

      // find new tail
      let node = vec.root[1];
      for (let level = vec.shift; level > 0; level -= _const.BITS) {
        node = node[0];
      }
      return update(vec, vec.origin, vec.capacity - 1, lowerShift, newRoot, node);
    } else {
      // height is same
      // diverges contain information on when the path diverges.
      var diverges = newTrieSize ^ newTrieSize - 1;
      var hasDiverged = false;
      let newRoot = copyFn(vec.root, vec.id);
      let node = newRoot;
      for (let level = vec.shift; level > 0; level -= _const.BITS) {
        var subidx = newTrieSize >>> level & _const.MASK;
        var child = node[subidx];
        if (hasDiverged) {
          node = child;
        } else if (!!(diverges >>> level)) {
          hasDiverged = true;
          node[subidx] = null;
          node = child;
        } else {
          child = copyFn(child, vec.id);
          node[subidx] = child;
          node = child;
        }
      }
      return update(vec, vec.origin, vec.capacity - 1, vec.shift, newRoot, node);
    }
  }
}

function tailOffset(size) {
  return size - 1 & ~_const.MASK;
}

function slice(vec, begin, end, update) {
  var size = vec.size;
  if (wholeSlice(begin, end, size)) {
    return vec;
  }
  return setListBounds(vec, resolveBegin(begin, size), resolveEnd(end, size), update);
}

function wholeSlice(begin, end, size) {
  return (begin === 0 || size !== undefined && begin <= -size) && (end === undefined || size !== undefined && end >= size);
}

function resolveBegin(begin, size) {
  return resolveIndex(begin, size, 0);
}

function resolveEnd(end, size) {
  return resolveIndex(end, size, size);
}

function resolveIndex(index, size, defaultIndex) {
  return index === undefined ? defaultIndex : index < 0 ? Math.max(0, size + index) : size === undefined ? index : Math.min(size, index);
}

function newId() {
  return {};
}

function vecNodeFor(vec, i) {
  if (i >= tailOffset(vec.capacity)) {
    return vec.tail;
  } else {
    var node = vec.root;
    for (var level = vec.shift; level > 0; level -= _const.BITS) {
      node = node[i >>> level & _const.MASK];
    }
    return node;
  }
}

function setListBounds(vec, begin, end, update) {
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
    newLevel += _const.BITS;
    offsetShift += 1 << newLevel;
  }
  if (offsetShift) {
    newOrigin += offsetShift;
    oldOrigin += offsetShift;
    newCapacity += offsetShift;
    oldCapacity += offsetShift;
  }

  var oldTailOffset = tailOffset(oldCapacity);
  var newTailOffset = tailOffset(newCapacity);

  // New size might need creating a higher root.
  while (newTailOffset >= 1 << newLevel + _const.BITS) {
    newRoot = ensureEditable(newRoot && newRoot.length ? [newRoot] : [], owner);
    newLevel += _const.BITS;
  }

  // Locate or create the new tail.
  var oldTail = vec.tail;
  var newTail = newTailOffset < oldTailOffset ? vecNodeFor(vec, newCapacity - 1) : newTailOffset > oldTailOffset ? newTopFn([], owner) : oldTail;

  // Merge Tail into tree.
  if (oldTail && newTailOffset > oldTailOffset && newOrigin < oldCapacity && oldTail.length) {
    newRoot = ensureEditable(newRoot, owner);
    var node = newRoot;
    for (var level = newLevel; level > _const.BITS; level -= _const.BITS) {
      var idx = oldTailOffset >>> level & _const.MASK;
      node = node[idx] = ensureEditable(node[idx], owner);
    }
    node[oldTailOffset >>> _const.BITS & _const.MASK] = oldTail;
  }

  // If the size has been reduced, there's a chance the tail needs to be trimmed.
  if (newCapacity < oldCapacity) {
    newTail = newTail && removeAfter(newTail, owner, 0, newCapacity);
  }

  // If the new origin is within the tail, then we do not need a root.
  if (newOrigin >= newTailOffset) {
    newOrigin -= newTailOffset;
    newCapacity -= newTailOffset;
    newLevel = _const.BITS;
    newRoot = null;
    newTail = newTail && removeBefore(newTail, owner, 0, newOrigin);

    // Otherwise, if the root has been trimmed, garbage collect.
  } else if (newOrigin > oldOrigin || newTailOffset < oldTailOffset) {
    offsetShift = 0;

    // Identify the new top root node of the subtree of the old root.
    while (newRoot) {
      var beginIndex = newOrigin >>> newLevel & _const.MASK;
      if (beginIndex !== newTailOffset >>> newLevel & _const.MASK) {
        break;
      }
      if (beginIndex) {
        offsetShift += (1 << newLevel) * beginIndex;
      }
      newLevel -= _const.BITS;
      newRoot = newRoot[beginIndex];
    }

    // Trim the new sides of the new root.
    if (newRoot && newOrigin > oldOrigin) {
      newRoot = removeBefore(newRoot, owner, newLevel, newOrigin - offsetShift);
    }
    if (newRoot && newTailOffset < oldTailOffset) {
      newRoot = removeAfter(newRoot, owner, newLevel, newTailOffset - offsetShift);
    }
    if (offsetShift) {
      newOrigin -= offsetShift;
      newCapacity -= offsetShift;
    }
  }

  return update(vec, newOrigin, newCapacity, newLevel, newRoot, newTail);
}

function removeBefore(node, ownerID, level, index) {
  if (index === level ? 1 << level : 0 || node.length === 0) {
    return node;
  }
  var originIndex = index >>> level & _const.MASK;
  if (originIndex >= node.length) {
    return newTopFn(ownerID);
  }
  var removingFirst = originIndex === 0;
  var newChild;
  if (level > 0) {
    var oldChild = node[originIndex];
    newChild = oldChild && removeBefore(oldChild, ownerID, level - _const.BITS, index);
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

function removeAfter(node, ownerID, level, index) {
  if (index === (level ? 1 << level : 0) || node.length === 0) {
    return node;
  }
  var sizeIndex = index - 1 >>> level & _const.MASK;
  if (sizeIndex >= node.length) {
    return node;
  }

  var newChild;
  if (level > 0) {
    var oldChild = node[sizeIndex];
    newChild = oldChild && removeAfter(oldChild, ownerID, level - _const.BITS, index);
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

// defaults for testing
function ensureEditable(node, id) {
  return node;
}

function newTopFn(id) {
  return new Array(_const.BRANCHING);
}