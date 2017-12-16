import { HashTransform } from "./hash";
import { rorBytes, xorBytes } from "../../cryptopunk.bitarith";
import { bytesToHex } from "../../cryptopunk.utils";

// TODO: Clean-up

const MILL_SIZE = 19; // Equivalent to Panama STATE_SIZE
const BELT_WIDTH = 3; // Equivalent to Panama STAGE_SIZE
const BELT_LENGTH = 13; // Equivalent to Panama STAGES
const BLANK_ITERATIONS = 16;

function gamma(context)
{
	const mill = context.mill,
		t = context.millTemp,
		wordLength = context.wordLength;
		
	for (let i = 0; i < MILL_SIZE; i++)
	{
		const ti = t[i];
		for (let j = 0; j < wordLength; j++)
		{
			ti[j] = mill[i][j] ^
				(
					mill[(i + 1) % MILL_SIZE][j] |
					~mill[(i + 2) % MILL_SIZE][j]
				);
		}
	}
}

function pi(context)
{
	const mill = context.millTemp,
		t = context.mill;

	let shift = 0;
	for (let i = 0; i < MILL_SIZE; i++)
	{
		shift += i;
		t[i].set(mill[(7 * i) % MILL_SIZE]);
		rorBytes(t[i], shift);
	}
}

function theta(context)
{
	const mill = context.mill,
		t = context.millTemp;

	for (let i = 0; i < MILL_SIZE; i++)
	{
		t[i].set(mill[i]);
		xorBytes(t[i], mill[(i + 1) % MILL_SIZE], mill[(i + 4) % MILL_SIZE]);
	}
}

function iota(context, symmetric)
{
	const mill = context.millTemp,
		t = context.mill,
		wordLength = context.wordLength;
	
	const first = mill[0];
	if (symmetric)
	{
		for (let i = 0; i < wordLength; i++)
		{
			first[i] = ~first[i];
		}
	}
	else
	{
		first[wordLength - 1] ^= 1;
	}

	for (let i = 0; i < MILL_SIZE; i++)
	{
		t[i].set(mill[i]);
	}
}

class RadioGatunTransform extends HashTransform
{
	constructor()
	{
		super();
		this.addOption("wordSize", "Word size in bits", 64, { min: 8, max: 64, step: 8 });
		this.addOption("symmetric", "Symmetric", false);
		this.paddingStartBit = 0x01;
	}

	transform(bytes)
	{
		const context = this.init(this.options.wordSize);
		const blockLength = this.options.wordSize * 3 / 8;
		this.reset(context);
		this.transformBlocks(bytes, blockLength, context);

		for (let i = 0; i < BLANK_ITERATIONS; i++)
		{
			this.roundFunction(context);
		}

		let offset = 0;
		const result = new Uint8Array(32);
		while (offset < 32)
		{
			this.roundFunction(context);
			offset = this.outputFunction(context, result, offset);
		}
		return result;
	}

	readBlock(block, wordLength)
	{
		const input = new Array(BELT_WIDTH);
		
		// Input is read as LE words
		let blockOffset = block.length - 1;
		for (let i = BELT_WIDTH - 1; i >= 0; i--)
		{
			const inp = input[i] = new Uint8Array(wordLength);
			for (let j = 0; j < wordLength; j++)
			{
				inp[j] = block[blockOffset--];
			}
		}
		return input;
	}

	transformBlock(block, context)
	{
		const input = this.readBlock(block, context.wordLength);
		
		this.inputFunction(context, input);
		this.roundFunction(context);
	}

	inputFunction(context, input)
	{
		for (let i = 0; i < BELT_WIDTH; i++)
		{
			xorBytes(context.mill[i + 16], input[i]);
			xorBytes(context.belt[0][i], input[i]);
		}
	}

	outputFunction(context, result, offset)
	{
		// Second and third word in mill is output
		// Note that words are little endian
		for (let i = 0; i < 2; i++)
		{
			const remaining = result.length - offset;
			const source = context.mill[i + 1];
			let sourceOffset = source.length - 1;
			let count = Math.min(remaining, source.length);
			while (count > 0)
			{
				result[offset++] = source[sourceOffset--];
				count--;
			}
		}
		return offset;
	}

	roundFunction(context)
	{
		const belt = context.belt,
			mill = context.mill;

		// Rotate belt:
		const lastStage = new Array(BELT_WIDTH);
		const ls = belt[BELT_LENGTH - 1];
		for (let i = 0; i < BELT_WIDTH; i++)
		{
			lastStage[i] = Uint8Array.from(ls[i]);
		}

		for (let i = BELT_LENGTH - 1; i > 0; i--)
		{
			belt[i] = belt[i - 1];
		}
		belt[0] = ls;

		// Mill to belt feed forward:
		for (let i = 0; i < 12; i++)
		{
			xorBytes(belt[i + 1][i % BELT_WIDTH], mill[i + 1]);
		}

		// Run the mill:
		gamma(context);
		pi(context);
		theta(context);
		iota(context, this.options.symmetric);

		// Belt to mill feed forward:
		for (let i = 0; i < BELT_WIDTH; i++)
		{
			xorBytes(mill[i + 13], lastStage[i]);
		}
	}

	init(wordSize)
	{
		const wordLength = Math.ceil(wordSize / 8);
		const context = {
			mill: new Array(MILL_SIZE),
			millTemp: new Array(MILL_SIZE),
			belt: new Array(BELT_LENGTH),
			wordSize,
			wordLength
		};

		for (let i = 0; i < BELT_LENGTH; i++)
		{
			context.belt[i] = new Array(BELT_WIDTH);
		}

		return context;
	}

	reset(context)
	{
		const mill = context.mill,
			millTemp = context.millTemp,
			belt = context.belt,
			wordLength = context.wordLength;
			
		for (let i = 0; i < mill.length; i++)
		{
			mill[i] = new Uint8Array(wordLength);
			millTemp[i] = new Uint8Array(wordLength);
		}
		for (let i = 0; i < belt.length; i++)
		{
			const stage = belt[i];
			for (let j = 0; j < stage.length; j++)
			{
				stage[j] = new Uint8Array(wordLength);
			}
		}
	}
}

export {
	RadioGatunTransform
};