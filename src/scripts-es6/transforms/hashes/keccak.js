import { HashTransform } from "./hash";
import { TransformError } from "../transforms";
import { and64, not64, rol64, xor64 } from "../../cryptopunk.bitarith";

const MAX_ROUNDS = 24;

function readLane(state, x, y)
{
	const position = (x + 5 * y) * 8;
	// Read as Little Endian
	return {
		lo: state[position + 3] << 24 |
			state[position + 2] << 16 |
			state[position + 1] <<  8 |
			state[position],
		hi: state[position + 7] << 24 |
			state[position + 6] << 16 |
			state[position + 5] <<  8 |
			state[position + 4]
	};
}

function writeLane(state, x, y, value)
{
	const position = (x + 5 * y) * 8;
	// Write as Little Endian
	state[position    ] = value.lo          & 0xff;
	state[position + 1] = (value.lo >>>  8) & 0xff;
	state[position + 2] = (value.lo >>> 16) & 0xff;
	state[position + 3] =  value.lo >>> 24;
	state[position + 4] = value.hi          & 0xff;
	state[position + 5] = (value.hi >>>  8) & 0xff;
	state[position + 6] = (value.hi >>> 16) & 0xff;
	state[position + 7] = (value.hi >>> 24) & 0xff;
}

function xorLane(state, x, y, value)
{
	const position = (x + 5 * y) * 8;
	// Write as Little Endian
	state[position    ] ^= value.lo          & 0xff;
	state[position + 1] ^= (value.lo >>>  8) & 0xff;
	state[position + 2] ^= (value.lo >>> 16) & 0xff;
	state[position + 3] ^=  value.lo >>> 24;
	state[position + 4] ^= value.hi          & 0xff;
	state[position + 5] ^= (value.hi >>>  8) & 0xff;
	state[position + 6] ^= (value.hi >>> 16) & 0xff;
	state[position + 7] ^= (value.hi >>> 24) & 0xff;
}

class KeccakBaseTransform extends HashTransform
{
	constructor()
	{
		super();
	}

	permute(state, rounds)
	{
		let R = 1;

		for (let round = 0; round < MAX_ROUNDS; round++)
		{
			// If we have less than 24 rounds, it's the initial rounds that will be skipped:
			if (round < MAX_ROUNDS - rounds)
			{
				for (let j = 0; j < 7; j++)
				{
					R = ((R << 1) ^ ((R >> 7) * 0x71)) % 256;
				}
				continue;
			}

			// Step θ
			const C = new Array(5);
			for (let x = 0; x < 5; x++)
			{
				C[x] = xor64(readLane(state, x, 0), readLane(state, x, 1), readLane(state, x, 2), readLane(state, x, 3), readLane(state, x, 4));
			}
			for (let x = 0; x < 5; x++)
			{
				const D = xor64(C[(x + 4) % 5], rol64(C[(x + 1) % 5], 1));
				for (let y = 0; y < 5; y++)
				{
					xorLane(state, x, y, D);
				}
			}

			//Steps ρ and π
			let x = 1, y = 0;
			let current = readLane(state, x, y);
			for (let t = 0; t < 24; t++)
			{
				const r = ((t + 1) * (t + 2) / 2) % 64;
				const Y = (2 * x + 3 * y) % 5;
				x = y;
				y = Y;
				const temp = readLane(state, x, y);
				writeLane(state, x, y, rol64(current, r));
				current = temp;
			}

			// Step χ
			const temp = new Array(5);
			for (y = 0; y < 5; y++)
			{
				for (x = 0; x < 5; x++)
				{
					temp[x] = readLane(state, x, y);
				}
				for (x = 0; x < 5; x++)
				{
					writeLane(state, x, y, xor64(temp[x], and64(not64(temp[(x + 1) % 5]), temp[(x + 2) % 5])));
				}
			}

			// Step ι
			for (let j = 0; j < 7; j++)
			{
				R = ((R << 1) ^ ((R >> 7) * 0x71)) % 256;
				if (R & 0x02)
				{
					const bitPosition = (1 << j) - 1;
					xorLane(state, 0, 0, rol64({ lo: 1, hi: 0 }, bitPosition));
				}
			}
		}
	}

	transform(bytes)
	{
		const capacity = this.options.capacity;
		const size = this.options.size;
		// "The rate r is a positive integer that is strictly less than the width b [1600]"
		// "The capacity, denoted by c, is the positive integer b - r. Thus, r + c = b."
		// It follows that the capacity must also be 0 < c < 1600. And r = b - c
		if (capacity <= 0 || capacity >= 1600)
		{
			throw new TransformError(`Capacity must be > 0 and < 1600. Was: ${capacity}`);
		}

		if (capacity % 8 !== 0)
		{
			throw new TransformError(`Capacity must be a multiple of 8. Was: ${capacity}`);
		}

		if (size % 8 !== 0)
		{
			throw new TransformError(`Size must be a multiple of 8. Was: ${size}`);
		}

		const rate = 1600 - capacity;
		const rateInBytes = rate / 8;
		// Delimited suffix is suffix + padding start bit.
		// Reading lsb to msb (as in the spec):
		// - Original Keccak (0x00) becomes     1 (0x01)
		// - SHA-3's      01 (0x02) becomes   011 (0x06)
		// - SHAKE's    1111 (0x0f) becomes 11111 (0x1f)
		const delimitedSuffix = this.options.delimitedSuffix;

		const rounds = this.options.rounds;

		const state = new Uint8Array(200);

		// Absorb input into state
		let remainingInput = bytes.length;
		let position = 0;
		let blockSize = 0;
		while (remainingInput > 0)
		{
			const input = bytes.subarray(position);
			blockSize = remainingInput < rateInBytes ? remainingInput : rateInBytes;
			for (let i = 0; i < blockSize; i++)
			{
				state[i] ^= input[i];
			}
			position += blockSize;
			remainingInput -= blockSize;

			if (blockSize === rateInBytes)
			{
				this.permute(state, rounds);
				blockSize = 0;
			}
		}

		// Padding.
		// Keccak's padding scheme consists of a suffix followed by a 1-bit (already combined here),
		// followed by 0-padding and then a 1-bit at the end. Since most of it is 0-bits
		// there's no point in creating a padded block and XOR'ing it into state. We've already absorbed
		// the remainder of the message above. So we'll just XOR the start and end padding bytes into
		// the state at the correct positions.
		state[blockSize] ^= delimitedSuffix;

		// If the suffix + starting 1-bit end up filling the block, we need another block of
		// 0 bits before the ending 1-bit. Once again, no point in creating and XOR'ing a block of 0 bits,
		// but we do need to permute the state.
		if (((delimitedSuffix & 0x80) !== 0) && (blockSize === rateInBytes - 1))
		{
			this.permute(state, rounds);
		}
		// Padding end bit at last byte position of block.
		state[rateInBytes - 1] ^= 0x80;
		this.permute(state, rounds);

		// Squeeze state out into output
		let remainingOutput = size / 8;
		const output = new Uint8Array(remainingOutput);
		let outputPosition = 0;
		while (remainingOutput > 0)
		{
			const outputBlockSize = remainingOutput < rateInBytes ? remainingOutput : rateInBytes;
			const outputBlock = state.subarray(0, outputBlockSize);
			output.set(outputBlock, outputPosition);
			outputPosition += outputBlockSize;
			remainingOutput -= outputBlockSize;

			if (remainingOutput > 0)
			{
				this.permute(state, rounds);
			}
		}

		return output;
	}
}

class KeccakTransform extends KeccakBaseTransform
{
	constructor()
	{
		super();
		this
			.addOption("capacity", "Capacity", 1024, { min: 8, max: 1592, step: 8 })
			.addOption("size", "Size", 512, { min: 0, step: 8 })
			.addOption("delimitedSuffix", "Delimited Suffix", 0x01, { min: 0, max: 255 }) // Delimited suffix (lsb) |1
			.addOption("rounds", "Rounds", 24);
	}
}

export {
	KeccakTransform,
	KeccakBaseTransform
};