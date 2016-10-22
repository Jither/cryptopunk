import { MdBaseTransform, CONSTANTS } from "./mdbase";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

const R = [
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
	0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15,
	0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15
];

const S = [
	3, 7, 11, 19, 3, 7, 11, 19, 3, 7, 11, 19, 3, 7, 11, 19,
	3, 5, 9, 13, 3, 5, 9, 13, 3, 5, 9, 13, 3, 5, 9, 13,
	3, 9, 11, 15, 3, 9, 11, 15, 3, 9, 11, 15, 3, 9, 11, 15
];

function op(q, a, x, s, t)
{
	return rol(add(a, q, x, t), s);
}

function f(a, b, c, d, x, s)
{
	return op((b & c) | ((~b) & d), a, x, s, 0);
}

function g(a, b, c, d, x, s)
{
	return op((b & c) | (b & d) | (c & d), a, x, s, CONSTANTS.SQRT2_DIV4);
}

function h(a, b, c, d, x, s)
{
	return op(b ^ c ^ d, a, x, s, CONSTANTS.SQRT3_DIV4);
}

const OPS = [f, g, h];

class Md4Transform extends MdBaseTransform
{
	constructor()
	{
		super();
		this.endianness = "LE";
	}

	transform(bytes)
	{
		const x = bytesToInt32sLE(this.padMessage(bytes, 32));

		let a = CONSTANTS.INIT_1_67;
		let b = CONSTANTS.INIT_2_EF;
		let c = CONSTANTS.INIT_3_98;
		let d = CONSTANTS.INIT_4_10;

		for (let index = 0; index < x.length; index += 16)
		{
			// TODO: Use subarray rather than index + 0
			const aa = a, bb = b, cc = c, dd = d;

			for (let step = 0; step < 48; step++)
			{
				const round = Math.floor(step / 16);
				const op = OPS[round];
				const temp = op(a, b, c, d, x[index + R[step]], S[step]);
				a = d;
				d = c;
				c = b;
				b = temp;
			}

			a = add(a, aa);
			b = add(b, bb);
			c = add(c, cc);
			d = add(d, dd);
		}

		return int32sToBytesLE([a, b, c, d]);
	}
}

export {
	Md4Transform
};