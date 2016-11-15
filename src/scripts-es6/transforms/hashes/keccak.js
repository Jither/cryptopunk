import { HashTransform } from "./hash";
import { TransformError } from "../transforms";
import { and64, not64, rol64, xor64 } from "../../cryptopunk.bitarith";

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

function append1bit(byte)
{
	let i = 0;
	while (i < 8)
	{
		if ((byte >>> i) === 0)
		{
			break;
		}
		i++;
	}
	return byte | (1 << i);
}

class KeccakBaseTransform extends HashTransform
{
	constructor()
	{
		super();
	}

	lfsr86540(lfsr)
	{
		const result = (lfsr[0] & 0x01) !== 0;
		if ((lfsr[0] & 0x80) !== 0)
		{
			lfsr[0] = (lfsr[0] << 1) ^ 0x71;
		}
		else
		{
			lfsr[0] <<= 1;
		}
		return result;
	}

	permute(state)
	{
		// Array just to pass it by reference
		const lfsrState = [ 0x01 ];

		for (let round = 0; round < 24; round++)
		{
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
				const bitPosition = (1 << j) - 1;
				if (this.lfsr86540(lfsrState))
				{
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
		// Combine suffix and padding start bit.
		// Reading lsb to msb (as in the spec):
		// - SHA-3's      01 (0x02) becomes   011 (0x06)
		// - SHAKE's    1111 (0x0f) becomes 11111 (0x1f)
		// - Original Keccak (0x00) becomes     1 (0x01)
		const suffixAndPaddingStart = append1bit(this.options.suffix);

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
				this.permute(state);
				blockSize = 0;
			}
		}

		// Padding.
		// Keccak's padding scheme consists of a suffix followed by a 1-bit (already combined here),
		// followed by 0-padding and then a 1-bit at the end. Since most of it is 0-bits
		// there's no point in creating a padded block and XOR'ing it into state. We've already absorbed
		// the remainder of the message above. So we'll just XOR the start and end padding bytes into
		// the state at the correct positions.
		state[blockSize] ^= suffixAndPaddingStart;

		// If the suffix + starting 1-bit end up filling the block, we need another block of
		// 0 bits before the ending 1-bit. Once again, no point in creating and XOR'ing a block of 0 bits,
		// but we do need to permute the state.
		if (((suffixAndPaddingStart & 0x80) !== 0) && (blockSize === rateInBytes - 1))
		{
			this.permute(state);
		}
		// Padding end bit at last byte position of block.
		state[rateInBytes - 1] ^= 0x80;
		this.permute(state);

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
				this.permute(state);
			}
		}

		return output;
	}
}

class KeccakTransform extends KeccakBaseTransform
{
	constructor()
	{
		super(1024, 512, 0x01);
		this
			.addOption("capacity", "Capacity", 1024, { min: 8, max: 1592, step: 8 })
			.addOption("size", "Size", 512, { min: 0, step: 8 })
			.addOption("suffix", "Suffix", 0x00, { min: 0, max: 255 });
	}
}

export {
	KeccakTransform,
	KeccakBaseTransform
};