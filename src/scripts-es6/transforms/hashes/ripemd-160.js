import { MdBaseTransform, CONSTANTS } from "./mdbase";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

const K_LEFT = [
	0x00000000,
	CONSTANTS.SQRT2_DIV4,
	CONSTANTS.SQRT3_DIV4,
	CONSTANTS.SQRT5_DIV4,
	CONSTANTS.SQRT7_DIV4
];

const K_RIGHT = [
	CONSTANTS.CBRT2_DIV4,
	CONSTANTS.CBRT3_DIV4,
	CONSTANTS.CBRT5_DIV4,
	CONSTANTS.CBRT7_DIV4,
	0x00000000
];

const R_LEFT = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
	7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
	3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
	1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
	4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
];

const R_RIGHT = [
	5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
	6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
	15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
	8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
	12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
];

const S_LEFT = [
	11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
	7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
	11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
	11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
	9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
];

const S_RIGHT = [
	8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
	9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
	9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
	15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
	8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
];

function op(q, a, x, s, t, e)
{
	return add(rol(add(a, q, x, t), s), e);
}

function f(a, b, c, d, e, x, s, t)
{
	return op(b ^ c ^ d, a, x, s, t, e);
}

function g(a, b, c, d, e, x, s, t)
{
	return op((b & c) | ((~b) & d), a, x, s, t, e);
}

function h(a, b, c, d, e, x, s, t)
{
	return op((b | (~c)) ^ d, a, x, s, t, e);
}

function i(a, b, c, d, e, x, s, t)
{
	return op((b & d) | (c & (~d)), a, x, s, t, e);
}

function j(a, b, c, d, e, x, s, t)
{
	return op(b ^ (c | (~d)), a, x, s, t, e);
}

const OPS_LEFT = [f, g, h, i, j];
const OPS_RIGHT = [j, i, h, g, f];

class RipeMd160Transform extends MdBaseTransform
{
	constructor()
	{
		super();
		this.endianness = "LE";
	}

	getIV()
	{
		return [
			CONSTANTS.INIT_1_67,
			CONSTANTS.INIT_2_EF,
			CONSTANTS.INIT_3_98,
			CONSTANTS.INIT_4_10,
			CONSTANTS.INIT_5_C3,
			// Same:
			CONSTANTS.INIT_1_67,
			CONSTANTS.INIT_2_EF,
			CONSTANTS.INIT_3_98,
			CONSTANTS.INIT_4_10,
			CONSTANTS.INIT_5_C3,
		];
	}

	transform(bytes)
	{
		const x = bytesToInt32sLE(this.padMessage(bytes, 32));

		let [a0, b0, c0, d0, e0, aa0, bb0, cc0, dd0, ee0] = this.getIV();

		for (let index = 0; index < x.length; index += 16)
		{
			// TODO: Use subarray rather than index + 0
			let  a =  a0,  b =  b0,  c =  c0,  d =  d0,  e =  e0,
				aa = aa0, bb = bb0, cc = cc0, dd = dd0, ee = ee0;

			/* eslint-disable camelcase */
			let op_left, op_right, k_left, k_right;
			for (let step = 0; step < 80; step++)
			{
				const round = Math.floor(step / 16);
				
				op_left = OPS_LEFT[round];
				op_right = OPS_RIGHT[round];
				k_left = K_LEFT[round];
				k_right = K_RIGHT[round];

				let temp = op_left(a, b, c, d, e, x[index + R_LEFT[step]], S_LEFT[step], k_left);
				a = e;
				e = d;
				d = rol(c, 10);
				c = b;
				b = temp;

				temp = op_right(aa, bb, cc, dd, ee, x[index + R_RIGHT[step]], S_RIGHT[step], k_right);
				aa = ee;
				ee = dd;
				dd = rol(cc, 10);
				cc = bb;
				bb = temp;

				if (this.isRipeMd320)
				{
					// Exchange chaining value after each round
					switch (step)
					{
						case 15: [b, bb] = [bb, b]; break;
						case 31: [d, dd] = [dd, d]; break;
						case 47: [a, aa] = [aa, a]; break;
						case 63: [c, cc] = [cc, c]; break;
						case 79: [e, ee] = [ee, e]; break;
					}
				}
			}
			/* eslint-enable camelcase */

			if (this.isRipeMd320)
			{
				a0 = add(a0, a);
				b0 = add(b0, b);
				c0 = add(c0, c);
				d0 = add(d0, d);
				e0 = add(e0, e);
				aa0 = add(aa0, aa);
				bb0 = add(bb0, bb);
				cc0 = add(cc0, cc);
				dd0 = add(dd0, dd);
				ee0 = add(ee0, ee);
			}
			else
			{
				const temp = add(b0, c, dd);
				b0 = bb0 = add(c0, d, ee);
				c0 = cc0 = add(d0, e, aa);
				d0 = dd0 = add(e0, a, bb);
				e0 = ee0 = add(a0, b, cc);
				a0 = aa0 = temp;
			}
		}

		if (this.isRipeMd320)
		{
			return int32sToBytesLE([a0, b0, c0, d0, e0, aa0, bb0, cc0, dd0, ee0]);
		}
		else
		{
			return int32sToBytesLE([a0, b0, c0, d0, e0]);
		}
	}
}

class RipeMd320Transform extends RipeMd160Transform
{
	constructor()
	{
		super();
		this.isRipeMd320 = true;
	}

	getIV()
	{
		return [
			CONSTANTS.INIT_1_67,
			CONSTANTS.INIT_2_EF,
			CONSTANTS.INIT_3_98,
			CONSTANTS.INIT_4_10,
			CONSTANTS.INIT_5_C3,
			// Reversed (big endian 1-4, nibbles switched for 5)
			CONSTANTS.INIT_1_76,
			CONSTANTS.INIT_2_FE,
			CONSTANTS.INIT_3_89,
			CONSTANTS.INIT_4_01,
			CONSTANTS.INIT_5_3C
		];
	}
}

export {
	RipeMd160Transform,
	RipeMd320Transform
};