import { MdBaseTransform, CONSTANTS } from "./mdbase";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

const K_LEFT = [
	0x00000000,
	CONSTANTS.SQRT2_DIV4,
	CONSTANTS.SQRT3_DIV4
];

const K_RIGHT = [
	CONSTANTS.CBRT2_DIV4,
	0x00000000,
	CONSTANTS.CBRT3_DIV4
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

function op(q, a, x, t, s)
{
	return rol(add(a, q, x, t), s);
}

function f(a, b, c, d, x, s, t)
{
	return op((b & c) | ((~b) & d), a, x, t, s);
}

function g(a, b, c, d, x, s, t)
{
	return op((b & c) | (b & d) | (c & d), a, x, t, s);
}

function h(a, b, c, d, x, s, t)
{
	return op(b ^ c ^ d, a, x, t, s);
}

const OPS = [f, g, h];

class RipeMdTransform extends MdBaseTransform
{
	constructor()
	{
		super();
		this.endianness = "LE";
	}

	transform(bytes)
	{
		const x = bytesToInt32sLE(this.padMessage(bytes, 32));

		let a0 = CONSTANTS.INIT_1_67,
			b0 = CONSTANTS.INIT_2_EF,
			c0 = CONSTANTS.INIT_3_98,
			d0 = CONSTANTS.INIT_4_10;

		for (let index = 0; index < x.length; index += 16)
		{
			// TODO: Use subarray rather than index + 0
			let  a = a0,  b = b0,  c = c0,  d = d0,
				aa = a0, bb = b0, cc = c0, dd = d0;

			let f_left, f_right, k_left, k_right;

			for (let step = 0; step < 48; step++)
			{
				const round = Math.floor(step / 16);
				f_left = f_right = OPS[round];
				k_left = K_LEFT[round];
				k_right = K_RIGHT[round];

				let temp = f_left(a, b, c, d, x[index + R[step]], S[step], k_left);
				a = d;
				d = c;
				c = b;
				b = temp;

				temp = f_right(aa, bb, cc, dd, x[index + R[step]], S[step], k_right);
				aa = dd;
				dd = cc;
				cc = bb;
				bb = temp;
			}

			let temp = add(b0, c, dd);
			b0 = add(c0, d, aa);
			c0 = add(d0, a, bb);
			d0 = add(a0, b, cc);
			a0 = temp;
		}

		return int32sToBytesLE([a0, b0, c0, d0]);
	}
}

export {
	RipeMdTransform
};