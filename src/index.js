import { PVec } from "./pvec";
import { TVec } from "./tvec";

TVec.prototype.asPersistent = function (){
	this.id = null;
	return new PVec(this.size, this.shift, this.root, this.compressedTail());
};
PVec.prototype.asTransient = function () {
	return new TVec(this.size, this.shift, this.root, this.tail);
};


export const empty = new PVec();
export function isPVec(vec){
	return !!vec && vec.__isVec_Sentinel;
}
export { PVec, TVec };
