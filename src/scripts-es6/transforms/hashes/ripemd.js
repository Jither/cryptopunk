import { MdHashTransform } from "./hash";
import { ROOTS, INIT } from "../shared/constants";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

const K_LEFT = [
	0x00000000,
	ROOTS.SQRT2_DIV4,
	ROOTS.SQRT3_DIV4
];

const K_RIGHT = [
	ROOTS.CBRT2_DIV4,
	0x00000000,
	ROOTS.CBRT3_DIV4
];

const R = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
	7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 14, 2, 11, 8,
	3, 10, 2, 4, 9, 15, 8, 1, 14, 7, 0, 6, 11, 13, 5, 12
];

const S = [
	11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
	7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 7, 11, 13, 12,
	11, 13, 14, 7, 14, 9, 13, 15, 6, 8, 13, 6, 12, 5, 7, 5
];

function op(q, a, x, s, t)
{
	return rol(add(a, q, x, t), s);
}

function f(a, b, c, d, x, s, t)
{
	return op((b & c) | ((~b) & d), a, x, s, t);
}

function g(a, b, c, d, x, s, t)
{
	return op((b & c) | (b & d) | (c & d), a, x, s, t);
}

function h(a, b, c, d, x, s, t)
{
	return op(b ^ c ^ d, a, x, s, t);
}

const OPS = [f, g, h];

class RipeMdTransform extends MdHashTransform
{
	constructor()
	{
		super(512);
	}

	transform(bytes)
	{
		const state = [
			INIT._1_67,
			INIT._2_EF,
			INIT._3_98,
			INIT._4_10
		];

		this.transformBlocks(bytes, state);

		return int32sToBytesLE(state);
	}

	transformBlock(block, state)
	{
		const x = bytesToInt32sLE(block);

		let [a, b, c, d] = state;
		let aa = a, bb = b, cc = c, dd = d;

		/* eslint-disable camelcase */
		let f_left, f_right, k_left, k_right;

		for (let step = 0; step < 48; step++)
		{
			const round = Math.floor(step / 16);
			f_left = f_right = OPS[round];
			k_left = K_LEFT[round];
			k_right = K_RIGHT[round];

			let temp = f_left(a, b, c, d, x[R[step]], S[step], k_left);
			a = d;
			d = c;
			c = b;
			b = temp;

			temp = f_right(aa, bb, cc, dd, x[R[step]], S[step], k_right);
			aa = dd;
			dd = cc;
			cc = bb;
			bb = temp;
		}
		/* eslint-enable camelcase */

		const temp = add(state[1], c, dd);
		state[1] = add(state[2], d, aa);
		state[2] = add(state[3], a, bb);
		state[3] = add(state[0], b, cc);
		state[0] = temp;
	}
}

export {
	RipeMdTransform
};