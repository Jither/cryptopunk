import { HashTransform, CONSTANTS } from "./hash";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

// RIPEMD-160 vs 128: Last constant, left and right are simply left out
const K_LEFT = [
	0x00000000,
	CONSTANTS.SQRT2_DIV4,
	CONSTANTS.SQRT3_DIV4,
	CONSTANTS.SQRT5_DIV4
];

const K_RIGHT = [
	CONSTANTS.CBRT2_DIV4,
	CONSTANTS.CBRT3_DIV4,
	CONSTANTS.CBRT5_DIV4,
	0x00000000
];

// RIPEMD-160 vs 128: Last 16 block indices and rotates are simply left out
const R_LEFT = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
	7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
	3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
	1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2
];

const R_RIGHT = [
	5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
	6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
	15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
	8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14
];

const S_LEFT = [
	11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
	7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
	11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
	11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12
];

const S_RIGHT = [
	8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
	9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
	9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
	15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8
];

// RIPEMD-160 vs 128: Addition of e is simply left out for all operations
function op(q, a, x, s, t)
{
	return rol(add(a, q, x, t), s);
}

function f(a, b, c, d, x, s, t)
{
	return op(b ^ c ^ d, a, x, s, t);
}

function g(a, b, c, d, x, s, t)
{
	return op((b & c) | ((~b) & d), a, x, s, t);
}

function h(a, b, c, d, x, s, t)
{
	return op((b | (~c)) ^ d, a, x, s, t);
}

function i(a, b, c, d, x, s, t)
{
	return op((b & d) | (c & (~d)), a, x, s, t);
}

const OPS_LEFT = [f, g, h, i];
const OPS_RIGHT = [i, h, g, f];

class RipeMd128Transform extends HashTransform
{
	constructor()
	{
		super(512);
	}

	getIV()
	{
		return [
			CONSTANTS.INIT_1_67,
			CONSTANTS.INIT_2_EF,
			CONSTANTS.INIT_3_98,
			CONSTANTS.INIT_4_10,
			// Same:
			CONSTANTS.INIT_1_67,
			CONSTANTS.INIT_2_EF,
			CONSTANTS.INIT_3_98,
			CONSTANTS.INIT_4_10
		];
	}

	transform(bytes)
	{
		const state = this.getIV();

		this.transformBlocks(bytes, state);

		if (!this.isRipeMd256)
		{
			// RIPEMD-128 doesn't include aa, bb, cc, dd
			state.splice(-4);
		}
		return int32sToBytesLE(state);
	}

	transformBlock(block, state)
	{
		const x = bytesToInt32sLE(block);
		let [a, b, c, d, aa, bb, cc, dd] = state;

		/* eslint-disable camelcase */
		let op_left, op_right, k_left, k_right;

		// RIPEMD-160 vs 128: 4 rounds (64 steps) instead of 5 (80 steps)
		for (let step = 0; step < 64; step++)
		{
			const round = Math.floor(step / 16);
			op_left = OPS_LEFT[round];
			op_right = OPS_RIGHT[round];
			k_left = K_LEFT[round];
			k_right = K_RIGHT[round];

			// RIPEMD-160 vs 128: No ROL of c/cc when assigning to d/dd
			let temp = op_left(a, b, c, d, x[R_LEFT[step]], S_LEFT[step], k_left);
			a = d;
			d = c;
			c = b;
			b = temp;

			temp = op_right(aa, bb, cc, dd, x[R_RIGHT[step]], S_RIGHT[step], k_right);
			aa = dd;
			dd = cc;
			cc = bb;
			bb = temp;

			if (this.isRipeMd256)
			{
				// Exchange chaining value after each round
				// RIPEMD-160 vs 128: Different order of chaining values
				switch (step)
				{
					case 15: [a, aa] = [aa, a]; break;
					case 31: [b, bb] = [bb, b]; break;
					case 47: [c, cc] = [cc, c]; break;
					case 63: [d, dd] = [dd, d]; break;
				}
			}
		}
		/* eslint-enable camelcase */

		if (this.isRipeMd256)
		{
			state[0] = add(state[0], a);
			state[1] = add(state[1], b);
			state[2] = add(state[2], c);
			state[3] = add(state[3], d);
			state[4] = add(state[4], aa);
			state[5] = add(state[5], bb);
			state[6] = add(state[6], cc);
			state[7] = add(state[7], dd);
		}
		else
		{
			state[4] = add(state[1], c, dd);
			state[1] = state[5] = add(state[2], d, aa);
			state[2] = state[6] = add(state[3], a, bb);
			state[3] = state[7] = add(state[0], b, cc);
			state[0] = state[4];
		}
	}
}

class RipeMd256Transform extends RipeMd128Transform
{
	constructor()
	{
		super();
		this.isRipeMd256 = true;
	}

	getIV()
	{
		return [
			CONSTANTS.INIT_1_67,
			CONSTANTS.INIT_2_EF,
			CONSTANTS.INIT_3_98,
			CONSTANTS.INIT_4_10,

			CONSTANTS.INIT_1_76,
			CONSTANTS.INIT_2_FE,
			CONSTANTS.INIT_3_89,
			CONSTANTS.INIT_4_01,
		];
	}
}

export {
	RipeMd128Transform,
	RipeMd256Transform
};