import { BlockCipherTransform } from "./block-cipher";
import { RandProvider } from "../shared/rand";

const RANDOM_SEED = [];

function precompute()
{
	if (RANDOM_SEED.length > 0)
	{
		return;
	}

	// First 251 groups in "A Million Random Digits" (RAND 1955) mod 256
	const randProvider = new RandProvider();
	for (let i = 0; i < 251; i++)
	{
		RANDOM_SEED.push(randProvider.number() % 256);
	}
}

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
		precompute();

		this.checkBytesSize("Key", keyBytes, { min: 5, max: 125 });

		const blockLength = this.options.blockSize / 8;

		const keys = this.cacheKeys(
			"FROG",
			() => this.generateKeys(keyBytes, blockLength, this.options.rounds),
			keyBytes,
			blockLength,
			this.options.rounds
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