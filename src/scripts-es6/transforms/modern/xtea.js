import { BlockCipherTransform } from "./block-cipher";
import { int32sToBytesBE, bytesToInt32sBE } from "../../cryptopunk.utils";
import { add } from "../../cryptopunk.bitarith";

const DELTA = 0x9e3779b9;
const ROUNDS = 32;

class XTeaTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, 128);

		const key = bytesToInt32sBE(keyBytes);

		return this.transformBlocks(bytes, 64, key);
	}
}

class XTeaEncryptTransform extends XTeaTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, k)
	{
		let [v0, v1] = bytesToInt32sBE(block);
		let sum = 0;
		for (let i = 0; i < ROUNDS; i++)
		{
			let K = k[sum & 3];
			v0 = add(v0, add((v1 << 4) ^ (v1 >>> 5), v1) ^ add(sum, K));
			sum = add(sum, DELTA);
			K = k[(sum >>> 11) & 3];
			v1 = add(v1, add((v0 << 4) ^ (v0 >>> 5), v0) ^ add(sum, K));
		}
		dest.set(int32sToBytesBE([v0, v1]), destOffset);
	}
}

class XTeaDecryptTransform extends XTeaTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, k)
	{
		let [v0, v1] = bytesToInt32sBE(block);
		let sum = (DELTA * ROUNDS) & 0xffffffff;
		for (let i = 0; i < ROUNDS; i++)
		{
			let K = k[(sum >>> 11) & 3];
			v1 = add(v1, -(add((v0 << 4) ^ (v0 >>> 5), v0) ^ add(sum, K)));
			sum = add(sum, -DELTA);
			K = k[sum & 3];
			v0 = add(v0, -(add((v1 << 4) ^ (v1 >>> 5), v1) ^ add(sum, K)));
		}
		dest.set(int32sToBytesBE([v0, v1]), destOffset);
	}
}

export {
	XTeaEncryptTransform,
	XTeaDecryptTransform
};