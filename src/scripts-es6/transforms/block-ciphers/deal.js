import { BlockCipherTransform } from "./block-cipher";
import { DesEncryptTransform, DesDecryptTransform } from "./des";
import { xorBytes } from "../../cryptopunk.bitarith";
import cache from "../../cryptopunk.cache";
import { bytesToHex } from "../../cryptopunk.utils";

const ROUNDS_BY_KEYSIZE = {
	128: 6,
	192: 6,
	256: 8
};

const CACHE_PREFIX = "DEAL";

// Fixed DES key for generating sub keys
const K = Uint8Array.from([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);

class DealTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.enc = new DesEncryptTransform();
		this.enc.setOption("checkParity", false);
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, [128, 192, 256]);

		const keySize = keyBytes.length * 8;
		const rounds = ROUNDS_BY_KEYSIZE[keySize];

		const direction = this.decrypt ? "dec" : "enc";
		const keyHex = bytesToHex(keyBytes);
		const cacheKey = `${CACHE_PREFIX}_${keyHex}_${direction}`;
		const subKeys = cache.getOrAdd(cacheKey, () => this.generateSubKeys(keyBytes, rounds));

		return this.transformBlocks(bytes, 128, subKeys, rounds);
	}

	transformBlock(block, dest, destOffset, subKeys, rounds)
	{
		let left = block.subarray(0, 8);
		let right = block.subarray(8, 16);

		// This Feistel-like network swaps after last round
		// That means we have to swap before decrypting
		if (this.decrypt)
		{
			[left, right] = [right, left];
		}

		for (let r = 0; r < rounds; r++)
		{
			const temp = left;
			left = this.enc.transform(left, subKeys[r]);
			xorBytes(left, right);
			right = temp;
		}

		// This Feistel-like network swaps after last round
		// That means we have to swap after decrypting
		if (this.decrypt)
		{
			[left, right] = [right, left];
		}

		dest.set(left, destOffset);
		dest.set(right, destOffset + 8);
	}

	generateSubKeys(keyBytes, rounds)
	{
		const keyCount = keyBytes.length / 8;

		const k = new Array(keyCount);
		// Split into 64-bit keys:
		for (let i = 0; i < keyCount; i++)
		{
			k[i] = keyBytes.subarray(i * 8, i * 8 + 8);
		}

		const subKeys = new Array(rounds);
		const rk = new Uint8Array(8);
		const enc = this.enc;

		function makeRoundKey(userKey, roundKey, constant)
		{
			rk.set(userKey);
			if (constant)
			{
				rk[0] ^= constant;
			}
			if (roundKey)
			{
				xorBytes(rk, roundKey);
			}
			return enc.transform(rk, K);
		}

		switch (keyCount)
		{
			case 2:
				subKeys[0] = makeRoundKey(k[0]);
				subKeys[1] = makeRoundKey(k[1], subKeys[0]);
				subKeys[2] = makeRoundKey(k[0], subKeys[1], 0x80);
				subKeys[3] = makeRoundKey(k[1], subKeys[2], 0x40);
				subKeys[4] = makeRoundKey(k[0], subKeys[3], 0x20);
				subKeys[5] = makeRoundKey(k[1], subKeys[4], 0x10);
				break;
			case 3:
				subKeys[0] = makeRoundKey(k[0]);
				subKeys[1] = makeRoundKey(k[1], subKeys[0]);
				subKeys[2] = makeRoundKey(k[2], subKeys[1]);
				subKeys[3] = makeRoundKey(k[0], subKeys[2], 0x80);
				subKeys[4] = makeRoundKey(k[1], subKeys[3], 0x40);
				subKeys[5] = makeRoundKey(k[2], subKeys[4], 0x20);
				break;
			case 4:
				subKeys[0] = makeRoundKey(k[0]);
				subKeys[1] = makeRoundKey(k[1], subKeys[0]);
				subKeys[2] = makeRoundKey(k[2], subKeys[1]);
				subKeys[3] = makeRoundKey(k[3], subKeys[2]);
				subKeys[4] = makeRoundKey(k[0], subKeys[3], 0x80);
				subKeys[5] = makeRoundKey(k[1], subKeys[4], 0x40);
				subKeys[6] = makeRoundKey(k[2], subKeys[5], 0x20);
				subKeys[7] = makeRoundKey(k[3], subKeys[6], 0x10);
				break;
		}

		return subKeys;
	}
}

class DealEncryptTransform extends DealTransform
{
	constructor()
	{
		super(false);
	}
}

class DealDecryptTransform extends DealTransform
{
	constructor()
	{
		super(true);
	}

	generateSubKeys(keyBytes, rounds)
	{
		const keys = super.generateSubKeys(keyBytes, rounds);
		keys.reverse();
		return keys;
	}
}

export {
	DealEncryptTransform,
	DealDecryptTransform
};