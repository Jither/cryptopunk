import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { add, ror, rol } from "../../cryptopunk.bitarith";

const ROUNDS = 16;
const CONSTANT = 0x9e3779b9;

class RedPikeTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, 64);

		const keys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 64, keys);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		let [rk0, rk1] = keys;
		let [x0, x1] = bytesToInt32sBE(block);

		for (let i = 0; i < ROUNDS; i++)
		{
			rk0 = add(rk0, CONSTANT);
			rk1 = add(rk1, -CONSTANT);

			x0 ^= rk0;
			x0 = add(x0, x1);
			x0 = rol(x0, x1 & 0x1f);

			x1 = ror(x1, x0 & 0x1f);
			x1 = add(x1, -x0);
			x1 ^= rk1;
		}

		dest.set(int32sToBytesBE([x1, x0]), destOffset);
	}
}

class RedPikeEncryptTransform extends RedPikeTransform
{
	constructor()
	{
		super(false);
	}

	generateSubKeys(keyBytes)
	{
		return bytesToInt32sBE(keyBytes);
	}
}

class RedPikeDecryptTransform extends RedPikeTransform
{
	constructor()
	{
		super(true);
	}

	generateSubKeys(keyBytes)
	{
		const result = bytesToInt32sBE(keyBytes);
		const constant = (CONSTANT * (ROUNDS + 1)) & 0xffffffff;
		return [
			add(result[1], -constant),
			add(result[0], constant)
		];
	}
}

export {
	RedPikeEncryptTransform,
	RedPikeDecryptTransform
};