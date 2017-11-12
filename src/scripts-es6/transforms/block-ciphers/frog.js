import { BlockCipherTransform } from "./block-cipher";
import { TransformError } from "../transforms";
import cache from "../../cryptopunk.cache";
import { bytesToHex } from "../../cryptopunk.utils";

const CACHE_PREFIX = "FROG";

// First 251 groups in "A Million Random Digits" (RAND 1955) mod 256
const RANDOM_SEED = [
	0x71, 0x15, 0xe8, 0x12, 0x71, 0x5c, 0x3f, 0x9d, 0x7c, 0xc1, 0xa6, 0xc5, 0x7e, 0x38, 0xe5, 0xe5,
	0x9c, 0xa2, 0x36, 0x11, 0xe6, 0x59, 0xbd, 0x57, 0xa9, 0x00, 0x51, 0xcc, 0x08, 0x46, 0xcb, 0xe1,
	0xa0, 0x3b, 0xa7, 0xbd, 0x64, 0x9d, 0x54, 0x0b, 0x07, 0x82, 0x1d, 0x33, 0x20, 0x2d, 0x87, 0xed,
	0x8b, 0x21, 0x11, 0xdd, 0x18, 0x32, 0x59, 0x4a, 0x15, 0xcd, 0xbf, 0xf2, 0x54, 0x35, 0x03, 0xe6,
	0xe7, 0x76, 0x0f, 0x0f, 0x6b, 0x04, 0x15, 0x22, 0x03, 0x9c, 0x39, 0x42, 0x5d, 0xff, 0xbf, 0x03,
	0x55, 0x87, 0xcd, 0xc8, 0xb9, 0xcc, 0x34, 0x25, 0x23, 0x18, 0x44, 0xb9, 0xc9, 0x0a, 0xe0, 0xea,
	0x07, 0x78, 0xc9, 0x73, 0xd8, 0x67, 0x39, 0xff, 0x5d, 0x6e, 0x2a, 0xf9, 0x44, 0x0e, 0x1d, 0x37,
	0x80, 0x54, 0x25, 0x98, 0xdd, 0x89, 0x27, 0x0b, 0xfc, 0x32, 0x90, 0x23, 0xb2, 0xbe, 0x2b, 0xa2,
	0x67, 0xf9, 0x6d, 0x08, 0xeb, 0x21, 0x9e, 0x6f, 0xfc, 0xcd, 0xa9, 0x36, 0x0a, 0x14, 0xdd, 0xc9,
	0xb2, 0xe0, 0x59, 0xb8, 0xb6, 0x41, 0xc9, 0x0a, 0x3c, 0x06, 0xbf, 0xae, 0x4f, 0x62, 0x1a, 0xa0,
	0xfc, 0x33, 0x3f, 0x4f, 0x06, 0x66, 0x7b, 0xad, 0x31, 0x03, 0x6e, 0xe9, 0x5a, 0x9e, 0xe4, 0xd2,
	0xd1, 0xed, 0x1e, 0x5f, 0x1c, 0xb3, 0xcc, 0xdc, 0x48, 0xa3, 0x4d, 0xa6, 0xc0, 0x62, 0xa5, 0x19,
	0x91, 0xa2, 0x5b, 0xd4, 0x29, 0xe6, 0x6e, 0x06, 0x6b, 0xbb, 0x7f, 0x26, 0x52, 0x62, 0x1e, 0x43,
	0xe1, 0x50, 0xd0, 0x86, 0x3c, 0xfa, 0x99, 0x57, 0x94, 0x3c, 0x42, 0xa5, 0x48, 0x1d, 0xa5, 0x52,
	0xd3, 0xcf, 0x00, 0xb1, 0xce, 0x0d, 0x06, 0x0e, 0x5c, 0xf8, 0x3c, 0xc9, 0x84, 0x5f, 0x23, 0xd7,
	0x76, 0xb1, 0x79, 0xb4, 0x1b, 0x53, 0x83, 0x1a, 0x27, 0x2e, 0x0c    
];

function makePermutation(input)
{
	const length = input.length;
	const use = new Array(length);
	for (let i = 0; i < length; i++)
	{
		use[i] = i;
	}
	let index = 0;
	let last = length - 1;
	for (let i = 0; i < length - 1; i++)
	{
		index = (index + input[i]) % (last + 1);
		input[i] = use[index];
		if (index < last)
		{
			use.splice(index, 1);
		}
		last--;
		if (index > last)
		{
			index = 0;
		}
	}

	input[length - 1] = use[0];
}

function frogEncrypt(state, keys)
{
	for (let r = 0; r < keys.length; r++)
	{
		const key = keys[r];
		for (let i = 0; i < state.length; i++)
		{
			state[i] = key.substPermu[state[i] ^ key.xorBu[i]];
			const next = (i + 1) % state.length;
			state[next] ^= state[i];
			const k = key.bombPermu[i];
			state[k] ^= state[i];
		}
	}
}

function frogDecrypt(state, keys)
{
	for (let r = keys.length - 1; r >= 0; r--)
	{
		const key = keys[r];
		for (let i = state.length - 1; i >= 0; i--)
		{
			const k = key.bombPermu[i];
			state[k] ^= state[i];
			const next = (i + 1) % state.length;
			state[next] ^= state[i];
			state[i] = key.substPermu[state[i]] ^ key.xorBu[i];
		}
	}
}

const TEMP = new Uint8Array(256);

function invertPermutation(permutation)
{
	for (let i = 0; i < permutation.length; i++)
	{
		TEMP[permutation[i]] = i;
	}
	permutation.set(TEMP);
}

class FrogTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("rounds", "Rounds", 8, { min: 1, max: 20 })
			.addOption("blockSize", "Block size", 128, { min: 64, max: 1024, step: 8 });
	}

	transform(bytes, keyBytes)
	{
		if (keyBytes.length < 5 || keyBytes.length > 125)
		{
			throw new TransformError(`Key size must be between 5 bytes (40 bits) and 125 bytes (1000 bits). Was: ${keyBytes.length}.`);
		}

		const blockLength = this.options.blockSize / 8;
		const cacheKey = `${CACHE_PREFIX}_${bytesToHex(keyBytes)}_${this.decrypt ? "dec" : "enc" }_${blockLength}_${this.options.rounds}`;
		const keys = cache.getOrAdd(cacheKey, () => 
			this.generateKeys(keyBytes, blockLength, this.options.rounds)
		);

		return this.transformBlocks(bytes, this.options.blockSize, keys);
	}

	toStructuredKey(bytes, blockLength, rounds)
	{
		const subkeyLength = bytes.length / rounds;
		const result = new Array(rounds);
		for (let r = 0; r < rounds; r++)
		{
			const offsetXorBu = r * subkeyLength;
			const offsetSubstPermu = offsetXorBu + blockLength;
			const offsetBombPermu = offsetSubstPermu + 256;

			result[r] = {
				xorBu: bytes.subarray(offsetXorBu, offsetSubstPermu),
				substPermu: bytes.subarray(offsetSubstPermu, offsetBombPermu),
				bombPermu: bytes.subarray(offsetBombPermu, offsetBombPermu + blockLength)
			};
		}
		return result;
	}

	makeInternalKey(key, blockLength, rounds, decrypt)
	{
		const structuredKey = this.toStructuredKey(key, blockLength, rounds);
		for (let r = 0; r < rounds; r++)
		{
			const { substPermu, bombPermu } = structuredKey[r];

			makePermutation(substPermu);

			if (decrypt)
			{
				invertPermutation(substPermu);
			}

			makePermutation(bombPermu);

			this.make1Cycle(bombPermu, blockLength);
			this.removeReferences(bombPermu, blockLength);
		}
		return structuredKey;
	}

	make1Cycle(bombPermu, blockLength)
	{
		// Join smaller cycles in bombPermu into one cycle:
		const used = new Uint8Array(blockLength);
		let j = 0;
		for (let i = 0; i < blockLength - 1; i++)
		{
			if (bombPermu[j] === 0)
			{
				let k = j;

				do
				{
					k = (k + 1) % blockLength;
				}
				while (used[k] !== 0);

				bombPermu[j] = k;
				let l = k;

				while (bombPermu[l] !== k)
				{
					l = bombPermu[l];
				}

				bombPermu[l] = 0;
			}
			used[j] = 1;
			j = bombPermu[j];
		}
	}

	removeReferences(bombPermu, blockLength)
	{
		// Remove references to next element within bombPermu:
		for (let i = 0; i < blockLength; i++)
		{
			const j = (i + 1) % blockLength;

			if (bombPermu[i] === j)
			{
				const k = (j + 1) % blockLength;
				bombPermu[i] = k;
			}
		}
	}

	generateKeys(keyBytes, blockLength, rounds)
	{
		const keyLength = keyBytes.length;
		const internalKeyLength = (blockLength * 2 + 256) * rounds;
		
		const simpleKey = new Uint8Array(internalKeyLength);
		for (let i = 0; i < simpleKey.length; i++)
		{
			simpleKey[i] = RANDOM_SEED[i % 251] ^ keyBytes[i % keyLength];
		}

		const internalKey = this.makeInternalKey(simpleKey, blockLength, rounds, /* decrypt */ false);

		const iv = new Uint8Array(blockLength);
		const ivLength = Math.min(keyLength, blockLength);
		for (let i = 0; i < ivLength; i++)
		{
			iv[i] ^= keyBytes[i];
		}
		iv[0] ^= keyLength;

		let i = 0;
		const result = new Uint8Array(internalKeyLength);
		while (i < internalKeyLength)
		{
			frogEncrypt(iv, internalKey);
			let length = internalKeyLength - i;
			if (length > blockLength)
			{
				length = blockLength;
			}
			result.set(iv.subarray(0, length), i);
			i += length;
		}
		return this.makeInternalKey(result, blockLength, rounds, this.decrypt);
	}

}

class FrogEncryptTransform extends FrogTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		const state = Uint8Array.from(block);

		frogEncrypt(state, keys);

		dest.set(state, destOffset);
	}
}

class FrogDecryptTransform extends FrogTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		const state = Uint8Array.from(block);

		frogDecrypt(state, keys);

		dest.set(state, destOffset);
	}
}

export {
	FrogEncryptTransform,
	FrogDecryptTransform
};