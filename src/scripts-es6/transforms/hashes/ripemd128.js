import { MdBaseTransform, CONSTANTS } from "./mdbase";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

// RIPEMD-160 vs 128: Last constant, left and right are simply left out
const K_LEFT = [
	0x00000000,
	CONSTANTS.SQRT2_DIV4, // 2^^30 * SQRT(2)
	CONSTANTS.SQRT3_DIV4, // 2^^30 * SQRT(3)
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
function op(q, a, x, t, s)
{
	return rol(add(a, q, x, t), s);
}

function f(a, b, c, d, x, s, t)
{
	return op(b ^ c ^ d, a, x, t, s);
}

function g(a, b, c, d, x, s, t)
{
	return op((b & c) | ((~b) & d), a, x, t, s);
}

function h(a, b, c, d, x, s, t)
{
	return op((b | (~c)) ^ d, a, x, t, s);
}

function i(a, b, c, d, x, s, t)
{
	return op((b & d) | (c & (~d)), a, x, t, s);
}

const OPS_LEFT = [f, g, h, i];
const OPS_RIGHT = [i, h, g, f]

class RipeMd128Transform extends MdBaseTransform
{
	constructor()
	{
		super();
		this.endianness = "LE";
	}

	getInitialHashValues()
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
		const x = bytesToInt32sLE(this.padMessage(bytes, 32));

		let [a0, b0, c0, d0, aa0, bb0, cc0, dd0] = this.getInitialHashValues();

		for (let index = 0; index < x.length; index += 16)
		{
			// TODO: Use subarray rather than index + 0
			let [a, b, c, d] = [a0, b0, c0, d0];
			let [aa, bb, cc, dd] = [aa0, bb0, cc0, dd0];

			let f_left, f_right, k_left, k_right;

			// RIPEMD-160 vs 128: 4 rounds (64 steps) instead of 5 (80 steps)
			for (let step = 0; step < 64; step++)
			{
				const round = Math.floor(step / 16);
				f_left = OPS_LEFT[round];
				f_right = OPS_RIGHT[round];
				k_left = K_LEFT[round];
				k_right = K_RIGHT[round];

				let temp = f_left(a, b, c, d, x[index + R_LEFT[step]], S_LEFT[step], k_left);
				a = d;
				d = c;
				c = b;
				b = temp;

				temp = f_right(aa, bb, cc, dd, x[index + R_RIGHT[step]], S_RIGHT[step], k_right);
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

			if (this.isRipeMd256)
			{
				a0 = add(a0, a);
				b0 = add(b0, b);
				c0 = add(c0, c);
				d0 = add(d0, d);
				aa0 = add(aa0, aa);
				bb0 = add(bb0, bb);
				cc0 = add(cc0, cc);
				dd0 = add(dd0, dd);
			}
			else
			{
				let temp = add(b0, c, dd);
				b0 = bb0 = add(c0, d, aa);
				c0 = cc0 = add(d0, a, bb);
				d0 = dd0 = add(a0, b, cc);
				a0 = aa0 = temp;
			}
		}

		if (this.isRipeMd256)
		{
			return int32sToBytesLE([a0, b0, c0, d0, aa0, bb0, cc0, dd0]);
		}
		else
		{
			return int32sToBytesLE([a0, b0, c0, d0]);
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

	getInitialHashValues()
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