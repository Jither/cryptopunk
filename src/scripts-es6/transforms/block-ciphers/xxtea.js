import { TransformError } from "../transforms";
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

const VARIANT_NAMES = [
	"XXTEA",
	"Block TEA"
];

const VARIANT_VALUES = [
	"xxtea",
	"blocktea"
];

class XXTeaTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("variant", "Variant", "xxtea", { type: "select", texts: VARIANT_NAMES, values: VARIANT_VALUES });
		this.addOption("blockSize", "Block size", 64, { min: 64, step: 32 });
		this.addOption("endianness", "Endianess", "BE", { type: "select", texts: ENDIAN_NAMES, values: ENDIAN_VALUES });
	}

	mxBlockTea(z, y, k, sum)
	{
		return add(
			(z << 4) ^ (z >>> 5),
			z ^ k,
			sum
		);
	}

	mxXXTea(z, y, k, sum)
	{
		return add(
			(z >>> 5) ^ (y << 2), 
			(y >>> 3) ^ (z << 4), 
			add(sum ^ y, z ^ k)
		);
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, 128);

		const blockSize = this.options.blockSize;

		if (blockSize < 64)
		{
			throw new TransformError(`Block size must be >= 64 bits. Was: ${blockSize} bits.`);
		}
		if (blockSize % 32 !== 0)
		{
			throw new TransformError(`Block size must be a multiple of 32 bits. Was: ${blockSize} bits.`);
		}

		this.bytesToInt32s = this.options.endianness === "BE" ? bytesToInt32sBE : bytesToInt32sLE;
		this.int32sToBytes = this.options.endianness === "BE" ? int32sToBytesBE : int32sToBytesLE;

		let mx;
		switch (this.options.variant)
		{
			case "xxtea":
				mx = this.mxXXTea;
				break;
			case "blocktea":
				mx = this.mxBlockTea;
				break;
			default:
				throw new TransformError(`Unknown variant: '${this.options.variant}'.`);
		}

		const key = this.bytesToInt32s(keyBytes);

		return this.transformBlocks(bytes, blockSize, key, mx);
	}
}

class XXTeaEncryptTransform extends XXTeaTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, k, mx)
	{
		const v = this.bytesToInt32s(block);
		const blockLength = v.length;

		let sum = 0;
		const rounds = 6 + ((52 / blockLength) | 0);
		for (let r = 0; r < rounds; r++)
		{
			sum = add(sum, DELTA);
			let z = v[blockLength - 1];
			const e = (sum >>> 2) & 3;
			for (let p = 0; p < blockLength; p++)
			{
				const y = p < blockLength - 1 ? v[p + 1] : v[0];
				v[p] = add(v[p], mx(z, y, k[(p & 3) ^ e], sum));
				z = v[p];
			}
		}
		dest.set(this.int32sToBytes(v), destOffset);
	}
}

class XXTeaDecryptTransform extends XXTeaTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, k, mx)
	{
		const v = this.bytesToInt32s(block);
		const blockLength = v.length;

		const rounds = 6 + ((52 / blockLength) | 0);
		let sum = (rounds * DELTA) & 0xffffffff;
		for (let r = 0; r < rounds; r++)
		{
			const e = (sum >>> 2) & 3;
			let z;
			// y is only used by XXTEA
			let y = v[0];
			for (let p = blockLength - 1; p >= 0; p--)
			{
				z = p > 0 ? v[p - 1] : v[blockLength - 1];
				v[p] = add(v[p], -mx(z, y, k[(p & 3) ^ e], sum));
				y = v[p];
			}
			sum = add(sum, -DELTA);
		}
		dest.set(this.int32sToBytes(v), destOffset);
	}
}

export {
	XXTeaEncryptTransform,
	XXTeaDecryptTransform
};