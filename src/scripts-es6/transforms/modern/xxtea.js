import { BlockCipherTransform } from "./block-cipher";
import { int32sToBytesBE, bytesToInt32sBE, int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";
import { add } from "../../cryptopunk.bitarith";

const DELTA = 0x9e3779b9;
const ROUNDS = 32;

const ENDIAN_NAMES = [
	"Big Endian",
	"Little Endian"
];

const ENDIAN_VALUES = [
	"BE",
	"LE"
];

class BlockTeaTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("blockSize", "Block size", 64, { min: 64, step: 32 });
		this.addOption("endianness", "Endianess", "BE", { type: "select", texts: ENDIAN_NAMES, values: ENDIAN_VALUES });
	}

	transform(bytes, keyBytes, options)
	{
		this.checkKeySize(keyBytes, 128);

		if (options.blockSize < 64)
		{
			throw new TransformError(`Block size must be >= 64 bits. Was: ${options.blockSize} bits.`);
		}
		if (options.blockSize % 32 !== 0)
		{
			throw new TransformError(`Block size must be a multiple of 32 bits. Was: ${options.blockSize} bits.`);
		}

		this.bytesToInt32s = options.endianness === "BE" ? bytesToInt32sBE : bytesToInt32sLE;
		this.int32sToBytes = options.endianness === "BE" ? int32sToBytesBE : int32sToBytesLE;

		const key = this.bytesToInt32s(keyBytes);

		return this.transformBlocks(bytes, options.blockSize, key);
	}
}

function MX_BLOCKTEA(z, k, sum)
{
	return add(
		(z << 4) ^ (z >>> 5),
		z ^ k,
		sum
	);
}

function MX_XXTEA(z, y, k, sum)
{
	return add(
		(z >>> 5) ^ (y << 2), 
		(y >>> 3) ^ (z << 4), 
		add(sum ^ y, z ^ k)
	);
}

class BlockTeaEncryptTransform extends BlockTeaTransform
{
	constructor()
	{
		super(false);
	}

	doRound(v, k, blockLength, sum)
	{
		let z = v[blockLength - 1];
		const e = (sum >>> 2) & 3;
		for (let p = 0; p < blockLength; p++)
		{
			v[p] = add(v[p], MX_BLOCKTEA(z, k[(p & 3) ^ e], sum));
			z = v[p];
		}
	}

	transformBlock(block, dest, destOffset, k)
	{
		let v = this.bytesToInt32s(block);
		const blockLength = v.length;

		let sum = 0;
		let rounds = 6 + ((52 / blockLength) | 0);
		for (let r = 0; r < rounds; r++)
		{
			sum = add(sum, DELTA);
			this.doRound(v, k, blockLength, sum);
		}
		dest.set(this.int32sToBytes(v), destOffset);
	}
}

class BlockTeaDecryptTransform extends BlockTeaTransform
{
	constructor()
	{
		super(true);
	}

	doRound(v, k, blockLength, sum)
	{
		const e = (sum >>> 2) & 3;
		let z;
		for (let p = blockLength - 1; p > 0; p--)
		{
			z = v[p - 1];
			v[p] = add(v[p], -MX_BLOCKTEA(z, k[(p & 3) ^ e], sum));
		}
		z = v[blockLength - 1];
		v[0] = add(v[0], -MX_BLOCKTEA(z, k[e], sum));
	}

	transformBlock(block, dest, destOffset, k)
	{
		let v = this.bytesToInt32s(block);
		const blockLength = v.length;

		let rounds = 6 + ((52 / blockLength) | 0);
		let sum = (rounds * DELTA) & 0xffffffff;
		for (let r = 0; r < rounds; r++)
		{
			this.doRound(v, k, blockLength, sum);
			sum = add(sum, -DELTA);
		}
		dest.set(this.int32sToBytes(v), destOffset);
	}
}

class XXTeaEncryptTransform extends BlockTeaEncryptTransform
{
	doRound(v, k, blockLength, sum)
	{
		let z = v[blockLength - 1];
		let y;
		const e = (sum >>> 2) & 3;
		let p;
		
		for (p = 0; p < blockLength - 1; p++)
		{
			y = v[p + 1];
			v[p] = add(v[p], MX_XXTEA(z, y, k[(p & 3) ^ e]));
			z = v[p];
		}
		y = v[0];
		v[p] = add(v[p], MX_XXTEA(z, y, k[(p & 3) ^ e]));
	}
}

class XXTeaDecryptTransform extends BlockTeaDecryptTransform
{
	doRound(v, k, blockLength, sum)
	{
		let y = v[0];
		let z;
		const e = (sum >>> 2) & 3;
		let p;

		for (let p = blockLength - 1; p > 0; p--)
		{
			z = v[p - 1];
			v[p] = add(v[p], -MX_XXTEA(z, y, k[(p & 3) ^ e]));
			y = v[p];
		}

		z = v[blockLength - 1];
		v[0] = add(v[0], -MX_XXTEA(z, y, k[e]));
	}
}

export {
	BlockTeaEncryptTransform,
	BlockTeaDecryptTransform,
	XXTeaEncryptTransform,
	XXTeaDecryptTransform
};