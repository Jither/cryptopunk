import { MdHashTransform } from "./hash";
import { ror } from "../../cryptopunk.bitarith";
import { int32sToBytesBE, bytesToInt32sBE } from "../../cryptopunk.utils";
import { getMerkleStandardSboxes } from "../shared/rand";

const SIZE_VALUES = [128, 256];
const SIZE_NAMES = ["128 bits", "256 bits"];

const SHIFT_TABLE = [16, 8, 16, 24];

let SBOXES;

function precompute()
{
	if (SBOXES)
	{
		return;
	}
	SBOXES = getMerkleStandardSboxes(16);
}

class SnefruTransform extends MdHashTransform
{
	constructor()
	{
		super(512, "BE");
		this.paddingAlwaysAddsBlock = true;
		this.paddingStartBit = 0;
		
		this.addOption("size", "Size", 128, { type: "select", values: SIZE_VALUES, texts: SIZE_NAMES })
			.addOption("rounds", "Rounds", 8, { min: 1 });
	}

	transform(bytes)
	{
		precompute();

		const outputLength = this.options.size / 32;
		const state = new Uint32Array(outputLength);

		// Block size depends on output size
		this.blockSize = 512 - this.options.size;
		this.transformBlocks(bytes, state, outputLength);

		return int32sToBytesBE(state.subarray(0, outputLength));
	}

	transformBlock(block, state)
	{
		const blockWords = bytesToInt32sBE(block);
		const x = new Uint32Array(state.length + blockWords.length);
		x.set(state);
		x.set(blockWords, state.length);
		
		for (let r = 0; r < this.options.rounds; r++)
		{
			const sboxGroup = 2 * r;
			for (let b = 0; b < 4; b++)
			{
				for (let i = 0; i < x.length; i++)
				{
					const next = (i + 1) % x.length;
					const last = (i + x.length - 1) % x.length;

					const sboxIndex = sboxGroup + ((i >> 1) & 1);
					const sboxEntry = SBOXES[sboxIndex][x[i] & 0xff];
					x[next] ^= sboxEntry;
					x[last] ^= sboxEntry;
				}

				const shift = SHIFT_TABLE[b];
				
				for (let i = 0; i < x.length; i++)
				{
					x[i] = ror(x[i], shift);
				}
			}
		}

		for (let i = 0; i < state.length; i++)
		{
			state[i] ^= x[x.length - i - 1];
		}
	}
}

export {
	SnefruTransform
};