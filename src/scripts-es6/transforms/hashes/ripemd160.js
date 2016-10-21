import { MdBaseTransform } from "./mdbase";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

const SQRT2_DIV4 = 0x5a827999;
const SQRT3_DIV4 = 0x6ed9eba1;
const SQRT5_DIV4 = 0x8f1bbcdc;
const SQRT7_DIV4 = 0xa953fd4e;
const CBRT2_DIV4 = 0x50a28be6;
const CBRT3_DIV4 = 0x5c4dd124;
const CBRT5_DIV4 = 0x6d703ef3;
const CBRT7_DIV4 = 0x7a6d76e9;

const K_LEFT = [
	0x00000000,
	0x5a827999,
	0x6ed9eba1,
	0x8f1bbcdc,
	0xa953fd4e
];

const K_RIGHT = [
	0x50a28be6,
	0x5c4dd124,
	0x6d703ef3,
	0x7a6d76e9,
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

function op(q, a, x, t, s, e)
{
	return add(rol(add(a, q, x, t), s), e);
}

function f(a, b, c, d, e, x, s, t)
{
	return op(b ^ c ^ d, a, x, t, s, e);
}

function g(a, b, c, d, e, x, s, t)
{
	return op((b & c) | ((~b) & d), a, x, t, s, e);
}

function h(a, b, c, d, e, x, s, t)
{
	return op((b | (~c)) ^ d, a, x, t, s, e);
}

function i(a, b, c, d, e, x, s, t)
{
	return op((b & d) | (c & (~d)), a, x, t, s, e);
}

function j(a, b, c, d, e, x, s, t)
{
	return op(b ^ (c | (~d)), a, x, t, s, e);
}

class RipeMd160Transform extends MdBaseTransform
{
	constructor()
	{
		super();
		this.endianness = "LE";
	}

	getInitialHashValues()
	{
		return [
			0x67452301,
			0xefcdab89,
			0x98badcfe,
			0x10325476,
			0xc3d2e1f0,
			// Same:
			0x67452301,
			0xefcdab89,
			0x98badcfe,
			0x10325476,
			0xc3d2e1f0
		];
	}

	transform(bytes)
	{
		const x = bytesToInt32sLE(this.padMessage(bytes, 32));

		let [a0, b0, c0, d0, e0, aa0, bb0, cc0, dd0, ee0] = this.getInitialHashValues();

		for (let index = 0; index < x.length; index += 16)
		{
			// TODO: Use subarray rather than index + 0
			let [a, b, c, d, e] = [a0, b0, c0, d0, e0];
			let [aa, bb, cc, dd, ee] = [aa0, bb0, cc0, dd0, ee0];

			let f_left, f_right, k_left, k_right;
			for (let r = 0; r < 80; r++)
			{
				if (r < 16)
				{
					f_left = f;
					f_right = j;
					k_left = K_LEFT[0];
					k_right = K_RIGHT[0];
				}
				else if (r < 32)
				{
					f_left = g;
					f_right = i;
					k_left = K_LEFT[1];
					k_right = K_RIGHT[1];
				}
				else if (r < 48)
				{
					f_left = h;
					f_right = h;
					k_left = K_LEFT[2];
					k_right = K_RIGHT[2];
				}
				else if (r < 64)
				{
					f_left = i;
					f_right = g;
					k_left = K_LEFT[3];
					k_right = K_RIGHT[3];
				}
				else
				{
					f_left = j;
					f_right = f;
					k_left = K_LEFT[4];
					k_right = K_RIGHT[4];
				}
				let temp = f_left(a, b, c, d, e, x[index + R_LEFT[r]], S_LEFT[r], k_left);
				a = e;
				e = d;
				d = rol(c, 10);
				c = b;
				b = temp;

				temp = f_right(aa, bb, cc, dd, ee, x[index + R_RIGHT[r]], S_RIGHT[r], k_right);
				aa = ee;
				ee = dd;
				dd = rol(cc, 10);
				cc = bb;
				bb = temp;

				if (this.isRipeMd320)
				{
					// Exchange chaining value after each round
					switch (r)
					{
						case 15: [b, bb] = [bb, b]; break;
						case 31: [d, dd] = [dd, d]; break;
						case 47: [a, aa] = [aa, a]; break;
						case 63: [c, cc] = [cc, c]; break;
						case 79: [e, ee] = [ee, e]; break;
					}
				}
			}

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
				let temp = add(b0, c, dd);
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

	getInitialHashValues()
	{
		return [
			0x67452301,
			0xefcdab89,
			0x98badcfe,
			0x10325476,
			0xc3d2e1f0,

			0x76543210,
			0xfedcba98,
			0x89abcdef,
			0x01234567,
			0x3c2d1e0f
		];
	}
}

export {
	RipeMd160Transform,
	RipeMd320Transform
};