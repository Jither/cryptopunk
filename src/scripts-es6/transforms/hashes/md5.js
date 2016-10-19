import { MdBaseTransform } from "./mdbase";
import { bytesToInt32sLE, int32sToBytesLE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

// Unlike "full" MD-4/5, this implementation only works on whole byte messages

const S11 = 7;
const S12 = 12;
const S13 = 17;
const S14 = 22;

const S21 = 5;
const S22 = 9;
const S23 = 14;
const S24 = 20;

const S31 = 4;
const S32 = 11;
const S33 = 16;
const S34 = 23;

const S41 = 6;
const S42 = 10;
const S43 = 15;
const S44 = 21;

function op(q, a, b, x, s, t)
{
	return add(rol(add(a, q, x, t), s), b);
}

function f(a, b, c, d, x, s, t)
{
	return op((b & c) | ((~b) & d), a, b, x, s, t);
}

function g(a, b, c, d, x, s, t)
{
	return op((b & d) | (c & (~d)), a, b, x, s, t);
}

function h(a, b, c, d, x, s, t)
{
	return op(b ^ c ^ d, a, b, x, s, t);
}

function i(a, b, c, d, x, s, t)
{
	return op(c ^ (b | (~d)), a, b, x, s, t);
}

class Md5Transform extends MdBaseTransform
{
	constructor()
	{
		super();
		this.endianness = "LE";
	}

	transform(bytes)
	{
		const x = bytesToInt32sLE(this.padMessage(bytes, 32));

		let a = 0x67452301; // Still little endian (of 0x01234567 etc.)
		let b = 0xefcdab89;
		let c = 0x98badcfe;
		let d = 0x10325476;

		for (let index = 0; index < x.length; index += 16)
		{
			const aa = a;
			const bb = b;
			const cc = c;
			const dd = d;

			a = f(a, b, c, d, x[index +  0], S11, 0xd76aa478);
			d = f(d, a, b, c, x[index +  1], S12, 0xe8c7b756);
			c = f(c, d, a, b, x[index +  2], S13, 0x242070db);
			b = f(b, c, d, a, x[index +  3], S14, 0xc1bdceee);
			a = f(a, b, c, d, x[index +  4], S11, 0xf57c0faf);
			d = f(d, a, b, c, x[index +  5], S12, 0x4787c62a);
			c = f(c, d, a, b, x[index +  6], S13, 0xa8304613);
			b = f(b, c, d, a, x[index +  7], S14, 0xfd469501);
			a = f(a, b, c, d, x[index +  8], S11, 0x698098d8);
			d = f(d, a, b, c, x[index +  9], S12, 0x8b44f7af);
			c = f(c, d, a, b, x[index + 10], S13, 0xffff5bb1);
			b = f(b, c, d, a, x[index + 11], S14, 0x895cd7be);
			a = f(a, b, c, d, x[index + 12], S11, 0x6b901122);
			d = f(d, a, b, c, x[index + 13], S12, 0xfd987193);
			c = f(c, d, a, b, x[index + 14], S13, 0xa679438e);
			b = f(b, c, d, a, x[index + 15], S14, 0x49b40821);

			a = g(a, b, c, d, x[index +  1], S21, 0xf61e2562);
			d = g(d, a, b, c, x[index +  6], S22, 0xc040b340);
			c = g(c, d, a, b, x[index + 11], S23, 0x265e5a51);
			b = g(b, c, d, a, x[index +  0], S24, 0xe9b6c7aa);
			a = g(a, b, c, d, x[index +  5], S21, 0xd62f105d);
			d = g(d, a, b, c, x[index + 10], S22, 0x02441453);
			c = g(c, d, a, b, x[index + 15], S23, 0xd8a1e681);
			b = g(b, c, d, a, x[index +  4], S24, 0xe7d3fbc8);
			a = g(a, b, c, d, x[index +  9], S21, 0x21e1cde6);
			d = g(d, a, b, c, x[index + 14], S22, 0xc33707d6);
			c = g(c, d, a, b, x[index +  3], S23, 0xf4d50d87);
			b = g(b, c, d, a, x[index +  8], S24, 0x455a14ed);
			a = g(a, b, c, d, x[index + 13], S21, 0xa9e3e905);
			d = g(d, a, b, c, x[index +  2], S22, 0xfcefa3f8);
			c = g(c, d, a, b, x[index +  7], S23, 0x676f02d9);
			b = g(b, c, d, a, x[index + 12], S24, 0x8d2a4c8a);

			a = h(a, b, c, d, x[index +  5], S31, 0xfffa3942);
			d = h(d, a, b, c, x[index +  8], S32, 0x8771f681);
			c = h(c, d, a, b, x[index + 11], S33, 0x6d9d6122);
			b = h(b, c, d, a, x[index + 14], S34, 0xfde5380c);
			a = h(a, b, c, d, x[index +  1], S31, 0xa4beea44);
			d = h(d, a, b, c, x[index +  4], S32, 0x4bdecfa9);
			c = h(c, d, a, b, x[index +  7], S33, 0xf6bb4b60);
			b = h(b, c, d, a, x[index + 10], S34, 0xbebfbc70);
			a = h(a, b, c, d, x[index + 13], S31, 0x289b7ec6);
			d = h(d, a, b, c, x[index +  0], S32, 0xeaa127fa);
			c = h(c, d, a, b, x[index +  3], S33, 0xd4ef3085);
			b = h(b, c, d, a, x[index +  6], S34, 0x04881d05);
			a = h(a, b, c, d, x[index +  9], S31, 0xd9d4d039);
			d = h(d, a, b, c, x[index + 12], S32, 0xe6db99e5);
			c = h(c, d, a, b, x[index + 15], S33, 0x1fa27cf8);
			b = h(b, c, d, a, x[index +  2], S34, 0xc4ac5665);

			a = i(a, b, c, d, x[index +  0], S41, 0xf4292244);
			d = i(d, a, b, c, x[index +  7], S42, 0x432aff97);
			c = i(c, d, a, b, x[index + 14], S43, 0xab9423a7);
			b = i(b, c, d, a, x[index +  5], S44, 0xfc93a039);
			a = i(a, b, c, d, x[index + 12], S41, 0x655b59c3);
			d = i(d, a, b, c, x[index +  3], S42, 0x8f0ccc92);
			c = i(c, d, a, b, x[index + 10], S43, 0xffeff47d);
			b = i(b, c, d, a, x[index +  1], S44, 0x85845dd1);
			a = i(a, b, c, d, x[index +  8], S41, 0x6fa87e4f);
			d = i(d, a, b, c, x[index + 15], S42, 0xfe2ce6e0);
			c = i(c, d, a, b, x[index +  6], S43, 0xa3014314);
			b = i(b, c, d, a, x[index + 13], S44, 0x4e0811a1);
			a = i(a, b, c, d, x[index +  4], S41, 0xf7537e82);
			d = i(d, a, b, c, x[index + 11], S42, 0xbd3af235);
			c = i(c, d, a, b, x[index +  2], S43, 0x2ad7d2bb);
			b = i(b, c, d, a, x[index +  9], S44, 0xeb86d391);

			a = add(a, aa);
			b = add(b, bb);
			c = add(c, cc);
			d = add(d, dd);
		}

		return int32sToBytesLE([a, b, c, d]);
	}
}

export {
	Md5Transform
};