import { BlockCipherTransform } from "./block-cipher";
import { int32sToBytesBE, bytesToInt32sBE } from "../../cryptopunk.utils";
import { add } from "../../cryptopunk.bitarith";

const DELTA = 0x9e3779b9;
const DECRYPT_SUM = 0xc6ef3720;
const ROUNDS = 32;

class TeaTransform extends BlockCipherTransform
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

class TeaEncryptTransform extends TeaTransform
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
			sum = add(sum, DELTA);
			v0 = add(v0, add(v1 << 4, k[0]) ^ add(v1, sum) ^ add(v1 >>> 5, k[1]));
			v1 = add(v1, add(v0 << 4, k[2]) ^ add(v0, sum) ^ add(v0 >>> 5, k[3]));
		}
		dest.set(int32sToBytesBE([v0, v1]), destOffset);
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
		let [v0, v1] = bytesToInt32sBE(block);
		let sum = DECRYPT_SUM;
		for (let i = 0; i < ROUNDS; i++)
		{
			v1 = add(v1, -(add(v0 << 4, k[2]) ^ add(v0, sum) ^ add(v0 >>> 5, k[3])));
			v0 = add(v0, -(add(v1 << 4, k[0]) ^ add(v1, sum) ^ add(v1 >>> 5, k[1])));
			sum = add(sum, -DELTA);
		}
		dest.set(int32sToBytesBE([v0, v1]), destOffset);
	}
}

export {
	TeaEncryptTransform,
	TeaDecryptTransform
};