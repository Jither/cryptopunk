import { MdBaseTransform, CONSTANTS } from "./mdbase";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

// Unlike "full" MD-4/5, this implementation only works on whole byte messages

const S11 = 3;
const S12 = 7;
const S13 = 11;
const S14 = 19;

const S21 = 3;
const S22 = 5;
const S23 = 9;
const S24 = 13;

const S31 = 3;
const S32 = 9;
const S33 = 11;
const S34 = 15;

function op(q, a, b, x, s, t)
{
	return add(rol(add(a, q, x, t), s), b);
}

function f(a, b, c, d, x, s)
{
	return op((b & c) | ((~b) & d), a, 0, x, s, 0);
}

function g(a, b, c, d, x, s)
{
	return op((b & c) | (b & d) | (c & d), a, 0, x, s, CONSTANTS.SQRT2_DIV4);
}

function h(a, b, c, d, x, s)
{
	return op(b ^ c ^ d, a, 0, x, s, CONSTANTS.SQRT3_DIV4);
}

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

			// TODO: Roll into loop
			a = f(a, b, c, d, x[index +  0], S11);
			d = f(d, a, b, c, x[index +  1], S12);
			c = f(c, d, a, b, x[index +  2], S13);
			b = f(b, c, d, a, x[index +  3], S14);
			a = f(a, b, c, d, x[index +  4], S11);
			d = f(d, a, b, c, x[index +  5], S12);
			c = f(c, d, a, b, x[index +  6], S13);
			b = f(b, c, d, a, x[index +  7], S14);
			a = f(a, b, c, d, x[index +  8], S11);
			d = f(d, a, b, c, x[index +  9], S12);
			c = f(c, d, a, b, x[index + 10], S13);
			b = f(b, c, d, a, x[index + 11], S14);
			a = f(a, b, c, d, x[index + 12], S11);
			d = f(d, a, b, c, x[index + 13], S12);
			c = f(c, d, a, b, x[index + 14], S13);
			b = f(b, c, d, a, x[index + 15], S14);

			a = g(a, b, c, d, x[index +  0], S21);
			d = g(d, a, b, c, x[index +  4], S22);
			c = g(c, d, a, b, x[index +  8], S23);
			b = g(b, c, d, a, x[index + 12], S24);
			a = g(a, b, c, d, x[index +  1], S21);
			d = g(d, a, b, c, x[index +  5], S22);
			c = g(c, d, a, b, x[index +  9], S23);
			b = g(b, c, d, a, x[index + 13], S24);
			a = g(a, b, c, d, x[index +  2], S21);
			d = g(d, a, b, c, x[index +  6], S22);
			c = g(c, d, a, b, x[index + 10], S23);
			b = g(b, c, d, a, x[index + 14], S24);
			a = g(a, b, c, d, x[index +  3], S21);
			d = g(d, a, b, c, x[index +  7], S22);
			c = g(c, d, a, b, x[index + 11], S23);
			b = g(b, c, d, a, x[index + 15], S24);

			a = h(a, b, c, d, x[index +  0], S31);
			d = h(d, a, b, c, x[index +  8], S32);
			c = h(c, d, a, b, x[index +  4], S33);
			b = h(b, c, d, a, x[index + 12], S34);
			a = h(a, b, c, d, x[index +  2], S31);
			d = h(d, a, b, c, x[index + 10], S32);
			c = h(c, d, a, b, x[index +  6], S33);
			b = h(b, c, d, a, x[index + 14], S34);
			a = h(a, b, c, d, x[index +  1], S31);
			d = h(d, a, b, c, x[index +  9], S32);
			c = h(c, d, a, b, x[index +  5], S33);
			b = h(b, c, d, a, x[index + 13], S34);
			a = h(a, b, c, d, x[index +  3], S31);
			d = h(d, a, b, c, x[index + 11], S32);
			c = h(c, d, a, b, x[index +  7], S33);
			b = h(b, c, d, a, x[index + 15], S34);

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