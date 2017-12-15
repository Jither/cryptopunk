import { MdHashTransform } from "./hash";
import { getRijndaelSboxes } from "../shared/rijndael";
import { xorBytes } from "../../cryptopunk.bitarith";
import { int32ToBytesBE } from "../../cryptopunk.utils";

// TODO: Consider optimizing by getting rid of 2-dimensional arrays

let SBOX;

const VERSION_VALUES = [0, 1];

const VERSION_NAMES = [
	"Grøstl-0",
	"Grøstl"
];

// Shifts for Grøstl-0
const SHIFTS0 = [
	[0, 1, 2, 3, 4, 5, 6, 7],
	[0, 1, 2, 3, 4, 5, 6, 11]
];

// Shifts for Grøstl
const SHIFTS = [
	[0, 1, 2, 3, 4, 5, 6, 7],
	[1, 3, 5, 7, 0, 2, 4, 6],
	[0, 1, 2, 3, 4, 5, 6, 11],
	[1, 3, 5, 11, 0, 2, 4, 6]
];

const ROWS = 8;
const COLUMNS_512 = 8;
const COLUMNS_1024 = 16;
const LENGTH_512 = ROWS * COLUMNS_512;
const LENGTH_1024 = ROWS * COLUMNS_1024;
const ROUNDS_512 = 10;
const ROUNDS_1024 = 14;

const
	P512 = 0,
	Q512 = 1,
	P1024 = 2,
	Q1024 = 3;

function precompute()
{
	if (SBOX)
	{
		return;
	}
	[SBOX] = getRijndaelSboxes();
}

function addRoundConstant0(x, context, round, variant)
{
	switch (variant & 1)
	{
		case 0: x[0][0] ^= round; break;
		case 1: x[ROWS - 1][0] ^= round ^ 0xff; break;
	}
}

function addRoundConstant1(x, context, round, variant)
{
	const columns = context.columns;
	
	switch (variant & 1)
	{
		case 0:
			for (let i = 0; i < columns; i++)
			{
				x[0][i] ^= (i << 4) ^ round;
			}
			break;
		case 1:
			for (let i = 0; i < columns; i++)
			{
				for (let j = 0; j < ROWS - 1; j++)
				{
					x[j][i] ^= 0xff;
				}
			}
			for (let i = 0; i < columns; i++)
			{
				x[ROWS - 1][i] ^= (i << 4) ^ 0xff ^ round;
			}
			break;
	}
}

function subBytes(x, context)
{
	const columns = context.columns;
	
	for (let i = 0; i < ROWS; i++)
	{
		for (let j = 0; j < columns; j++)
		{
			x[i][j] = SBOX[x[i][j]];
		}
	}
}

function shiftBytes0(x, context, variant)
{
	const columns = context.columns;

	const R = SHIFTS0[variant >> 1];
	// Use context's temporary row array
	const temp = context.tempRow;

	for (let i = 0; i < ROWS; i++)
	{
		for (let j = 0; j < columns; j++)
		{
			temp[j] = x[i][(j + R[i]) % columns];
		}
		for (let j = 0; j < columns; j++)
		{
			x[i][j] = temp[j];
		}
	}
}

function shiftBytes1(x, context, variant)
{
	const columns = context.columns;
	
	const R = SHIFTS[variant];
	// Use context's temporary row array
	const temp = context.tempRow;
	
	for (let i = 0; i < ROWS; i++)
	{
		for (let j = 0; j < columns; j++)
		{
			temp[j] = x[i][(j + R[i]) % columns];
		}
		for (let j = 0; j < columns; j++)
		{
			x[i][j] = temp[j];
		}
	}
}

function mul2(b)
{
	return b & 0x80 ? (b << 1) ^ 0x1b : b << 1;
}

function mul3(b)
{
	return mul2(b) ^ b;
}

function mul4(b)
{
	return mul2(mul2(b));
}

function mul5(b)
{
	return mul4(b) ^ b;
}

/*
function mul6(b)
{
	return mul4(b) ^ mul2(b);
}
*/

function mul7(b)
{
	return mul4(b) ^ mul2(b) ^ b;
}

function mixBytes(x, context)
{
	const columns = context.columns;
	
	// Use context's temporary column array
	const temp = context.tempCol;

	for (let i = 0; i < columns; i++)
	{
		for (let j = 0; j < ROWS; j++)
		{
			temp[j] = 
				mul2(x[ j      % ROWS][i]) ^
				mul2(x[(j + 1) % ROWS][i]) ^
				mul3(x[(j + 2) % ROWS][i]) ^
				mul4(x[(j + 3) % ROWS][i]) ^
				mul5(x[(j + 4) % ROWS][i]) ^
				mul3(x[(j + 5) % ROWS][i]) ^
				mul5(x[(j + 6) % ROWS][i]) ^
				mul7(x[(j + 7) % ROWS][i]);
		}
		for (let j = 0; j < ROWS; j++)
		{
			x[j][i] = temp[j];
		}
	}
}

class GrøstlTransform extends MdHashTransform
{
	constructor()
	{
		// TODO: Variable rounds
		super(512, "BE", 8);
		this.addOption("version", "Version", 1, { type: "select", values: VERSION_VALUES, texts: VERSION_NAMES })
			.addOption("size", "Size", 256, { min: 8, max: 512, step: 8 });
	}
	
	transform(bytes)
	{
		precompute();

		switch (this.options.version)
		{
			case 0:
				this.shiftBytes = shiftBytes0;
				this.addRoundConstant = addRoundConstant0;
				break;
			case 1:
				this.shiftBytes = shiftBytes1;
				this.addRoundConstant = addRoundConstant1;
				break;
		}
		const context = this.initContext(this.options.size);
		this.blockSize = context.stateLength * 8;

		this.transformBlocks(bytes, context);

		this.outputTransformation(context);

		const length = this.options.size / 8;
		const output = new Uint8Array(length);
		let j = 0;
		for (let i = context.stateLength - length; i < context.stateLength; i++)
		{
			output[j++] = context.state[i % ROWS][Math.floor(i / ROWS)];
		}

		return output;
	}

	outputTransformation(context)
	{
		const columns = context.columns;

		// Reuse tempState1 for this:
		const temp = context.tempState1;
		const state = context.state;
		for (let i = 0; i < ROWS; i++)
		{
			for (let j = 0; j < columns; j++)
			{
				temp[i].set(state[i]);
			}
		}

		this.P(context, temp);

		for (let i = 0; i < ROWS; i++)
		{
			xorBytes(state[i], temp[i]);
		}
	}

	transformBlock(block, context)
	{
		const temp1 = context.tempState1;
		const temp2 = context.tempState2;
		const columns = context.columns;

		for (let i = 0; i < ROWS; i++)
		{
			const t1 = temp1[i];
			const t2 = temp2[i];
			const state = context.state[i];
			for (let j = 0; j < columns; j++)
			{
				const input = block[j * ROWS + i];
				t1[j] = state[j] ^ input;
				t2[j] = input;
			}
		}

		this.P(context, temp1);
		this.Q(context, temp2);

		for (let i = 0; i < ROWS; i++)
		{
			xorBytes(context.state[i], temp1[i], temp2[i]);
		}
	}

	P(context, x)
	{
		const variant = context.columns === 8 ? P512 : P1024;
		for (let i = 0; i < context.rounds; i++)
		{
			this.addRoundConstant(x, context, i, variant);
			subBytes(x, context);
			this.shiftBytes(x, context, variant);
			mixBytes(x, context);
		}
	}
	
	Q(context, x)
	{
		const variant = context.columns === 8 ? Q512 : Q1024;
		for (let i = 0; i < context.rounds; i++)
		{
			this.addRoundConstant(x, context, i, variant);
			subBytes(x, context);
			this.shiftBytes(x, context, variant);
			mixBytes(x, context);
		}
	}
	
	initContext(size)
	{
		const context = {};

		if (size <= 256)
		{
			context.rounds = ROUNDS_512;
			context.columns = COLUMNS_512;
			context.stateLength = LENGTH_512;
		}
		else
		{
			context.rounds = ROUNDS_1024;
			context.columns = COLUMNS_1024;
			context.stateLength = LENGTH_1024;
		}
		context.state = new Array(ROWS);
		context.tempState1 = new Array(ROWS);
		context.tempState2 = new Array(ROWS);
		for (let i = 0; i < ROWS; i++)
		{
			context.state[i] = new Uint8Array(context.columns);
			context.tempState1[i] = new Uint8Array(context.columns);
			context.tempState2[i] = new Uint8Array(context.columns);
		}
		context.tempRow = new Uint8Array(context.columns);
		context.tempCol = new Uint8Array(ROWS);

		// Store digest size into state:
		context.state[ROWS - 2][context.columns - 1] = (size >> 8) & 0xff;
		context.state[ROWS - 1][context.columns - 1] = size & 0xff;

		return context;
	}

	// Grøstl pads the same way as MD4 et al, but the suffix is the number of message blocks rather than the bit length
	padBlock(block, parameters)
	{
		const blockLength = this.blockLength;

		const length = block.length;

		let paddingLength = (blockLength - this.suffixLength) - (length % blockLength);
		if (paddingLength <= 0)
		{
			paddingLength += blockLength;
		}

		const result = new Uint8Array(length + paddingLength + this.suffixLength);

		// Copy message bytes to padded block:
		result.set(block);
		// Add "1-bit":
		result[length] = this.paddingStartBit;

		const blockCount = (parameters.messageLength + paddingLength + this.suffixLength) / blockLength;

		// Note: We only handle 2^32 blocks
		const offset = result.length - 4;
		result.set(int32ToBytesBE(blockCount), offset);

		return result;
	}
}

export {
	GrøstlTransform
};