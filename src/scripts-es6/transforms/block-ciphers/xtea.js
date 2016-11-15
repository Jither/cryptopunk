import { BlockCipherTransform } from "./block-cipher";
import { int32sToBytesBE, bytesToInt32sBE, int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";
import { add } from "../../cryptopunk.bitarith";

const DELTA = 0x9e3779b9;

const ENDIAN_NAMES = [
	"Big Endian",
	"Little Endian"
];

const ENDIAN_VALUES = [
	"BE",
	"LE"
];

class XTeaTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("endianness", "Endianess", "BE", { type: "select", texts: ENDIAN_NAMES, values: ENDIAN_VALUES })
			.addOption("rounds", "Rounds", 32, { min: 1 });
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, 128);

		this.bytesToInt32s = this.options.endianness === "BE" ? bytesToInt32sBE : bytesToInt32sLE;
		this.int32sToBytes = this.options.endianness === "BE" ? int32sToBytesBE : int32sToBytesLE;

		const key = this.bytesToInt32s(keyBytes);

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
		const rounds = this.options.rounds;

		let [v0, v1] = this.bytesToInt32s(block);
		let sum = 0;
		for (let i = 0; i < rounds; i++)
		{
			let K = k[sum & 3];
			v0 = add(v0, add((v1 << 4) ^ (v1 >>> 5), v1) ^ add(sum, K));
			sum = add(sum, DELTA);
			K = k[(sum >>> 11) & 3];
			v1 = add(v1, add((v0 << 4) ^ (v0 >>> 5), v0) ^ add(sum, K));
		}
		dest.set(this.int32sToBytes([v0, v1]), destOffset);
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
		const rounds = this.options.rounds;
		let [v0, v1] = this.bytesToInt32s(block);
		let sum = (DELTA * rounds) & 0xffffffff;
		for (let i = 0; i < rounds; i++)
		{
			let K = k[(sum >>> 11) & 3];
			v1 = add(v1, -(add((v0 << 4) ^ (v0 >>> 5), v0) ^ add(sum, K)));
			sum = add(sum, -DELTA);
			K = k[sum & 3];
			v0 = add(v0, -(add((v1 << 4) ^ (v1 >>> 5), v1) ^ add(sum, K)));
		}
		dest.set(this.int32sToBytes([v0, v1]), destOffset);
	}
}

export {
	XTeaEncryptTransform,
	XTeaDecryptTransform
};