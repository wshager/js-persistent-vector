import { PVec } from "./pvec";
import { TVec } from "./tvec";
import { values, entries } from "./shared";

TVec.prototype.asPersistent = function (){
	this.id = null;
	return new PVec(this.origin, this.capacity, this.shift, this.root, this.compressedTail());
};
PVec.prototype.asTransient = function () {
	return new TVec(this.origin, this.capacity, this.shift, this.root, this.tail);
};

PVec.prototype.concat = function(other){
    return this.asTransient().concat(other).asPersistent();
};

PVec.prototype.slice = function(begin,end){
    return this.asTransient().slice(begin,end).asPersistent();
};

PVec.prototype[Symbol.iterator] = TVec.prototype[Symbol.iterator] = PVec.prototype.values = TVec.prototype.values = function(){
    return values(this);
};

PVec.prototype.entries = TVec.prototype.entries = function(){
    return entries(this);
};

export const empty = new PVec();
export function isPVec(vec){
	return !!vec && vec.__isVec_Sentinel;
}
export { PVec, TVec };
