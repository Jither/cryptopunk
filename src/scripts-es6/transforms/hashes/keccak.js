import { Transform, TransformError } from "../transforms";
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

class KeccakBaseTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Hash");
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

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		const capacity = options.capacity;
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

		if (options.size % 8 !== 0)
		{
			throw new TransformError(`Size must be a multiple of 8. Was: ${options.size}`);
		}

		const rate = 1600 - capacity;
		const rateInBytes = rate / 8;
		const suffix = options.suffix;

		let remainingOutput = options.size / 8;

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

		// Add suffix bits
		state[blockSize] ^= suffix;

		if (((suffix & 0x80) !== 0) && (blockSize === rateInBytes - 1))
		{
			this.permute(state);
		}
		state[rateInBytes - 1] ^= 0x80;
		this.permute(state);

		// Squeeze state out into output
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
			.addOption("suffix", "Suffix", 0x01, { min: 0, max: 255 });
	}
}

export {
	KeccakTransform,
	KeccakBaseTransform
};