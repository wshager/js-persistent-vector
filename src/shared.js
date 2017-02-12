import { BITS, BRANCHING, MASK, EMPTY_TAIL } from "./const";

function newPath(levels, tail, newTopFn, id) {
    var topNode = tail;
    for (var level = levels; level > 0; level -= BITS) {
        var newTop = newTopFn(id);
        newTop[0] = topNode;
        topNode = newTop;
    }
    return topNode;
}

function pushLeaf(shift, i, root, tail, copyFn, newTopFn, id) {
    var newRoot = copyFn(root,id);
    var node = newRoot;
    for (var level = shift; level > BITS; level -= BITS) {
        var subidx = (i >>> level) & MASK;
        var child = node[subidx];
        if (!child) {
            node[subidx] = newPath(level - BITS, tail, newTopFn, id);
            return newRoot;
        }
        child = copyFn(child,id);
        node[subidx] = child;
        node = child;
    }
    node[(i >>> BITS) & MASK] = tail;
    return newRoot;
}

export function tailSize(vec) {
	return !vec.capacity ? 0 : ((vec.capacity - 1) & MASK) + 1;
}

export function wrapIndex(vec, index) {
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
  return index < 0 ? ensureSize(vec) + index : index;
}

export function get(vec, i) {
    if(i >= 0 && i < vec.size) {
        i += vec.origin;
        var node = vecNodeFor(vec,i);
        return node && node[i & MASK];
    }
}

export function* values(vec){
	for(var i = 0;i<vec.size;i++) {
		yield get(vec,i);
	}
}

export function* entries(vec){
	for(var i = 0;i<vec.size;i++) {
		yield [i,get(vec,i)];
	}
}

export function set(vec, i, val, update, updateTail, copyFn) {
    if (i > vec.size) throw new Error("Index out of bounds. Index :" + i + ", Size:" + vec.size);
    if(i == vec.size) return vec.push(val);
    i += vec.origin;
    if (i >= tailOffset(vec.capacity)) {
        return update(vec, vec.origin, vec.capacity, vec.shift, vec.root, updateTail(vec, i & MASK, val));
    }
    else {
        var newRoot = copyFn(vec.root,vec.id);
        var node = newRoot;
        for (var level = vec.shift; level > 0; level -= BITS) {
            var subidx = (i >>> level) & MASK;
            var child = node[subidx];
            child = copyFn(child,vec.id);
            node[subidx] = child;
            node = child;
        }
        node[i & MASK] = val;
        return update(vec,vec.origin, vec.capacity, vec.shift, newRoot, vec.tail);
    }
}

export function push(vec,val,update,updateTail,createTail,reShift,newTop,copyFn) {
    var ts = tailSize(vec);
    if (ts != BRANCHING) {
        return update(vec,vec.origin, vec.capacity + 1, vec.shift, vec.root, updateTail(vec,ts,val));
    }
    else { // have to insert tail into root.
        let newTail = createTail(val,vec.id);
        // Special case: If old size == BRANCHING, then tail is new root
        if (vec.size == BRANCHING) {
            return update(vec,vec.origin, vec.capacity + 1, reShift(vec), vec.tail, newTail);
        }
        // check if the root is completely filled. Must also increment
        // shift if that's the case.
        if ((vec.size >>> BITS) > (1 << vec.shift)) {
            let newRoot = newTop(vec.id);
            newRoot[0] = vec.root;
            newRoot[1] = newPath(vec.shift, vec.tail, newTop,vec.id);
            return update(vec,vec.origin, vec.capacity + 1, vec.shift + BITS, newRoot, newTail);
        }
        else { // still space in root
            let newRoot = pushLeaf(vec.shift, vec.size - 1, vec.root, vec.tail, copyFn, newTop);
            return update(vec,vec.origin, vec.capacity + 1, vec.shift, newRoot, newTail);
        }
    }
}

export function pop(vec,update,popTail,copyFn) {
    if (!vec.size) {
        throw new Error("Vector is already empty");
    }
    if (vec.size == 1) {
        vec.size = 0;
        return vec;
    }
    if (((vec.size - 1) & 31) > 0) {
        return update(vec,vec.origin, vec.capacity - 1, vec.shift, vec.root, popTail(vec));
    }
    else { // has to find new tail
        var newTrieSize = vec.size - BRANCHING - 1;
        // special case: if new size is 32, then new root turns is null, old
        // root the tail
        if (!newTrieSize) {
            return update(vec,0,BRANCHING,0,null,vec.root);
        }
        // check if we can reduce the trie's height
        if (newTrieSize == 1 << vec.shift) { // can lower the height
            var lowerShift = vec.shift - BITS;
            let newRoot = vec.root[0];

            // find new tail
            let node = vec.root[1];
            for (let level = vec.shift; level > 0; level -= BITS) {
                node = node[0];
            }
            return update(vec,vec.origin, vec.capacity - 1, lowerShift, newRoot, node);
        } else { // height is same
            // diverges contain information on when the path diverges.
            var diverges = newTrieSize ^ (newTrieSize - 1);
            var hasDiverged = false;
            let newRoot = copyFn(vec.root, vec.id);
            let node = newRoot;
            for (let level = vec.shift; level > 0; level -= BITS) {
                var subidx = (newTrieSize >>> level) & MASK;
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
            return update(vec,vec.origin, vec.capacity - 1, vec.shift, newRoot, node);
        }
    }
}

export function tailOffset(size) {
	return (size - 1) & (~MASK);
}


export function vecNodeFor(vec,i){
    if (i >= tailOffset(vec.capacity)) {
        return vec.tail;
    } else {
        var node = vec.root;
        for (var level = vec.shift; level > 0; level -= BITS) {
            node = node[(i >>> level) & MASK];
        }
        return node;
    }
}
