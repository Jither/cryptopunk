import { BlockCipherTransform } from "./block-cipher";
import { int32sToBytesBE, bytesToInt32sBE, int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";
import { add } from "../../cryptopunk.bitarith";

const DELTA = 0x9e3779b9;
const DECRYPT_SUM = 0xc6ef3720;
const ROUNDS = 32;

const ENDIAN_NAMES = [
	"Big Endian",
	"Little Endian"
];

const ENDIAN_VALUES = [
	"BE",
	"LE"
];

class TeaTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("endianness", "Endianess", "BE", { type: "select", texts: ENDIAN_NAMES, values: ENDIAN_VALUES });
	}

	transform(bytes, keyBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		this.bytesToInt32s = options.endianness === "BE" ? bytesToInt32sBE : bytesToInt32sLE;
		this.int32sToBytes = options.endianness === "BE" ? int32sToBytesBE : int32sToBytesLE;

		this.checkKeySize(keyBytes, 128);

		const key = this.bytesToInt32s(keyBytes);

		return this.transformBlocks(bytes, 64, key);
	}
}

class TeaEncryptTransform extends TeaTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, k, endianess)
	{
		let [v0, v1] = this.bytesToInt32s(block);
		let sum = 0;
		for (let i = 0; i < ROUNDS; i++)
		{
			sum = add(sum, DELTA);
			v0 = add(v0, add(v1 << 4, k[0]) ^ add(v1, sum) ^ add(v1 >>> 5, k[1]));
			v1 = add(v1, add(v0 << 4, k[2]) ^ add(v0, sum) ^ add(v0 >>> 5, k[3]));
		}
		dest.set(this.int32sToBytes([v0, v1]), destOffset);
	}
}

class TeaDecryptTransform extends TeaTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, k)
	{
		let [v0, v1] = this.bytesToInt32s(block);
		let sum = DECRYPT_SUM;
		for (let i = 0; i < ROUNDS; i++)
		{
			v1 = add(v1, -(add(v0 << 4, k[2]) ^ add(v0, sum) ^ add(v0 >>> 5, k[3])));
			v0 = add(v0, -(add(v1 << 4, k[0]) ^ add(v1, sum) ^ add(v1 >>> 5, k[1])));
			sum = add(sum, -DELTA);
		}
		dest.set(this.int32sToBytes([v0, v1]), destOffset);
	}
}

export {
	TeaEncryptTransform,
	TeaDecryptTransform
};