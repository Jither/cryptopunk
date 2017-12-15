import { HashTransform } from "./hash";
import { rol } from "../../cryptopunk.bitarith";
import cache from "../../cryptopunk.cache";
import { int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";

class CubeHashTransform extends HashTransform
{
	constructor()
	{
		super();
		this.addOption("initRounds", "Initialization rounds", 16, { min: 1 })
			.addOption("rounds", "Rounds", 16, { min: 1 })
			.addOption("blockLength", "Block length", 64, { min: 8, max: 1024, step: 8 })
			.addOption("finalRounds", "Finalization rounds", 32, { min: 1 })
			.addOption("outputSize", "Output size", 512, { min: 8, max: 512, step: 8 });
	}

	transform(bytes)
	{
		const blockLength = this.options.blockLength;
		const outputLength = this.options.outputSize / 8;
		const rounds = this.options.rounds;
		const initRounds = this.options.initRounds;

		const cacheKey = `CubeHash_${outputLength}_${blockLength}_${rounds}_${initRounds}`;
		
		// Clone state from cache so we don't mutate it:
		const state = Uint32Array.from(cache.getOrAdd(cacheKey, () => this.initState(outputLength, blockLength, rounds, initRounds)));

		this.transformBlocks(bytes, blockLength, state);

		state[31] ^= 0x1;
		this.transformState(state, this.options.finalRounds);

		return int32sToBytesLE(state).subarray(0, outputLength);
	}

	initState(outputLength, blockLength, rounds, initRounds)
	{
		const state = new Uint32Array(32);
		state[0] = outputLength;
		state[1] = blockLength;
		state[2] = rounds;
		this.transformState(state, initRounds);
		return state;
	}

	transformState(state, rounds)
	{
		for (let r = 0; r < rounds; r++)
		{
			// x[1jklm] += x[0jklm] 
			for (let i = 0; i < 16; i++)
			{
				state[i + 16] += state[i];
			}

			// rol(x[0jklm], 7)
			for (let i = 0; i < 16; i++)
			{
				state[i] = rol(state[i], 7);
			}

			// x[00klm] <-> x[01klm]
			for (let i = 0; i < 8; i++)
			{
				[state[i], state[i + 8]] = [state[i + 8], state[i]];
			}

			// x[0jklm] ^= x[1jklm]
			for (let i = 0; i < 16; i++)
			{
				state[i] ^= state[i + 16];
			}

			// x[1jk0m] <-> x[1jk1m]
			for (let i = 16; i < 32; i += 4)
			{
				[state[i    ], state[i + 2]] = [state[i + 2], state[i    ]];
				[state[i + 1], state[i + 3]] = [state[i + 3], state[i + 1]];
			}

			// x[1jklm] += x[0jklm]
			for (let i = 0; i < 16; i++)
			{
				state[i + 16] += state[i];
			}

			// rol(x[0jklm], 11)
			for (let i = 0; i < 16; i++)
			{
				state[i] = rol(state[i], 11);
			}

			// x[0j0lm] <-> x[0j1lm]
			for (let i = 0; i < 16; i += 8)
			{
				[state[i    ], state[i + 4]] = [state[i + 4], state[i    ]];
				[state[i + 1], state[i + 5]] = [state[i + 5], state[i + 1]];
				[state[i + 2], state[i + 6]] = [state[i + 6], state[i + 2]];
				[state[i + 3], state[i + 7]] = [state[i + 7], state[i + 3]];
			}

			// x[0jklm] ^= x[1jklm]
			for (let i = 0; i < 16; i++)
			{
				state[i] ^= state[i + 16];
			}

			// Swap x[1jkl0] with x[1jkl1]
			for (let i = 16; i < 32; i += 2)
			{
				[state[i    ], state[i + 1]] = [state[i + 1], state[i    ]];
			}
		}
	}

	transformBlock(block, state)
	{
		// XOR block into state (left to right, 32-bit Little Endian byte order)
		const words = bytesToInt32sLE(block);
		for (let i = 0; i < words.length; i++)
		{
			state[i] ^= words[i];
		}

		this.transformState(state, this.options.rounds);
	}
}

export {
	CubeHashTransform
};