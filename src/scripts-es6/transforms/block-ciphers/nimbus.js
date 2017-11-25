import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt64sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add64, xor64, mul64, mirror64, modInv64 } from "../../cryptopunk.bitarith";

const FIXED_KEY = [
	{ hi: 0x243f6a88, lo: 0x85a308d3 },
	{ hi: 0x13198a2e, lo: 0x03707345 },
	{ hi: 0xa4093822, lo: 0x299f31d1 },
	{ hi: 0x082efa98, lo: 0xec4e6c89 },
	{ hi: 0x452821e6, lo: 0x38d01377 },
	{ hi: 0xbe5466cf, lo: 0x34e90c6c },
	{ hi: 0xc0ac29b7, lo: 0xc97c50dd },
	{ hi: 0x3f84d5b5, lo: 0xb5470917 },
	{ hi: 0x9216d5d9, lo: 0x8979fb1b },
	{ hi: 0xd1310ba6, lo: 0x98dfb5ac }
];

function nimbus(x, keys)
{
	for (let i = 0; i < 5; i++)
	{
		x = mul64(keys[i], mirror64(xor64(keys[i + 5], x)));
	}
	return x;
}

function nimbusInv(x, keys)
{
	for (let i = 4; i >= 0; i--)
	{
		x = xor64(mirror64(mul64(keys[i], x)), keys[i + 5]);
	}
	return x;
}

class NimbusBaseTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, 128);

		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 64, subKeys);
	}

	generateSubKeys(keyBytes)
	{
		const keys = new Array(10);

		for (let i = 0; i < keys.length; i++)
		{
			keys[i] = { lo: 0, hi: 0 };
		}

		const keyWords = bytesToInt64sLE(keyBytes);

		for (let i = 0; i < keyWords.length; i++)
		{
			let x = xor64(keyWords[i], nimbus(keyWords[i], FIXED_KEY));

			for (let j = 0; j < keys.length; j++)
			{
				x = nimbus(x, FIXED_KEY);
				keys[j] = xor64(x, nimbus(add64(x, keys[j]), FIXED_KEY));
			}
		}

		for (let i = 0; i < keys.length / 2; i++)
		{
			keys[i].lo |= 1;
		}

		return keys;
	}
}

class NimbusEncryptTransform extends NimbusBaseTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		let y = bytesToInt64sLE(block)[0];

		y = nimbus(y, subKeys);

		dest.set(int32sToBytesLE([y.lo, y.hi]), destOffset);
	}
}

class NimbusDecryptTransform extends NimbusBaseTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		let y = bytesToInt64sLE(block)[0];

		y = nimbusInv(y, subKeys);

		dest.set(int32sToBytesLE([y.lo, y.hi]), destOffset);
	}

	generateSubKeys(keyBytes)
	{
		const keys = super.generateSubKeys(keyBytes);
		// Multiplicative inverse of k0-k4 mod 2^64
		for (let i = 0; i < 5; i++)
		{
			keys[i] = modInv64(keys[i]);
		}

		return keys;
	}
}

export {
	NimbusEncryptTransform,
	NimbusDecryptTransform
};
