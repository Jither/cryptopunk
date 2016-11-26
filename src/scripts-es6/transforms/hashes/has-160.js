import { MdHashTransform, CONSTANTS } from "./hash";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

// HAS-160 has many similarities to SHA-1. Differences noted below.

// HAS-160 vs SHA-1: slightly different round constants (basically "shifted 1 right")
const K = [
	0x00000000,
	CONSTANTS.SQRT2_DIV4,
	CONSTANTS.SQRT3_DIV4,
	CONSTANTS.SQRT5_DIV4
];

function f(a, b, c, d, e, x, t, rot)
{
	return add((b & c) ^ (~b & d), rol(a, rot), e, x, t);
}

function g(a, b, c, d, e, x, t, rot)
{
	return add(b ^ c ^ d, rol(a, rot), e, x, t);
}

// HAS-160 vs SHA-1: Different H function:
function h(a, b, c, d, e, x, t, rot)
{
	return add(c ^ (b | (~d)), rol(a, rot), e, x, t);
}

const STEPS = 80;
const OPS = [f, g, h, g];

// HAS-160 vs SHA-1: Rotation of a in F, G, H changes for each step:
const ROT_A = [5, 11, 7, 15, 6, 13, 8, 14, 7, 12, 9, 11, 8, 15, 6, 12, 9, 14, 5, 13];

// HAS-160 vs SHA-1: Rotation of b changes for each round:
const ROT_B = [10, 17, 25, 30];

// HAS-160 vs SHA-1: Different expansion. x[16..19] are built from varying parts of x[0..15] each round:
const EXPAND = [
	0, 1, 2, 3, 
	4, 5, 6, 7, 
	8, 9, 10, 11, 
	12, 13, 14, 15,

	3, 6, 9, 12, 
	15, 2, 5, 8, 
	11, 14, 1, 4, 
	7, 10, 13, 0,

	12, 5, 14, 7, 
	0, 9, 2, 11, 
	4, 13, 6, 15, 
	8, 1, 10, 3,

	7, 2, 13, 8, 
	3, 14, 9, 4, 
	15, 10, 5, 0, 
	11, 6, 1, 12
];

// HAS-160 vs SHA-1: Message parts (x[0..19]) are processed in a defined order by step:
const X_ORDER = [
	18, 0, 1, 2, 3, 19, 4, 5, 6, 7, 16, 8, 9, 10, 11, 17, 12, 13, 14, 15,
	18, 3, 6, 9, 12, 19, 15, 2, 5, 8, 16, 11, 14, 1, 4, 17, 7, 10, 13, 0,
	18, 12, 5, 14, 7, 19, 0, 9, 2, 11, 16, 4, 13, 6, 15, 17, 8, 1, 10, 3,
	18, 7, 2, 13, 8, 19, 3, 14, 9, 4, 16, 15, 10, 5, 0, 17, 11, 6, 1, 12,
];

class Has160Transform extends MdHashTransform
{
	constructor()
	{
		// HAS-160 vs SHA-1: Little Endian rather than Big Endian:
		super(512, "LE");
	}

	transform(bytes)
	{
		const state = [
			CONSTANTS.INIT_1_67,
			CONSTANTS.INIT_2_EF,
			CONSTANTS.INIT_3_98,
			CONSTANTS.INIT_4_10,
			CONSTANTS.INIT_5_C3
		];

		this.transformBlocks(bytes, state);

		return int32sToBytesLE(state);
	}

	transformBlock(block, state)
	{
		const x = bytesToInt32sLE(block);
		
		let [a, b, c, d, e] = state;

		let round = -1, 
			op, 
			rotB, 
			k;

		for (let step = 0; step < STEPS; step++)
		{
			const roundstep = step % 20;
			if (roundstep === 0)
			{
				round++;
				op = OPS[round];
				k = K[round];
				// HAS-160 vs SHA-1: Rotation of b changes for each round:
				rotB = ROT_B[round];

				// HAS-160 vs SHA-1: Different expansion. x[16..19] are built from varying parts of x[0..15] each round:
				// Extend from 16 to 20 (d)words
				let exp = round * 16;
				x[16] = x[EXPAND[exp++]] ^ x[EXPAND[exp++]] ^ x[EXPAND[exp++]] ^ x[EXPAND[exp++]];
				x[17] = x[EXPAND[exp++]] ^ x[EXPAND[exp++]] ^ x[EXPAND[exp++]] ^ x[EXPAND[exp++]];
				x[18] = x[EXPAND[exp++]] ^ x[EXPAND[exp++]] ^ x[EXPAND[exp++]] ^ x[EXPAND[exp++]];
				x[19] = x[EXPAND[exp++]] ^ x[EXPAND[exp++]] ^ x[EXPAND[exp++]] ^ x[EXPAND[exp++]];
			}

			// HAS-160 vs SHA-1:
			// - Message parts (x[0..19]) are processed in a defined order by step
			// - Rotation of a in F, G, H changes for each step
			const temp = op(a, b, c, d, e, x[X_ORDER[step]], k, ROT_A[roundstep]);

			e = d;
			d = c;
			c = rol(b, rotB);
			b = a;
			a = temp;
		}

		state[0] = add(state[0], a);
		state[1] = add(state[1], b);
		state[2] = add(state[2], c);
		state[3] = add(state[3], d);
		state[4] = add(state[4], e);
	}
}

export {
	Has160Transform
};