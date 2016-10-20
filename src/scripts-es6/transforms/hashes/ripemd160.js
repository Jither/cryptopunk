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


function op(q, a, x, t, s, e)
{
	return add(rol(add(a, q, x, t), s), e);
}

// f(a, b, c, d, e, x, s, SQRT2_DIV4)
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

	transform(bytes)
	{
		const x = bytesToInt32sLE(this.padMessage(bytes, 32));

		let a0 = 0x67452301; // Still little endian (of 0x01234567 etc.)
		let b0 = 0xefcdab89;
		let c0 = 0x98badcfe;
		let d0 = 0x10325476;
		let e0 = 0xc3d2e1f0;

		for (let index = 0; index < x.length; index += 16)
		{
			// TODO: Use subarray rather than index + 0
			let [a, b, c, d, e] = [a0, b0, c0, d0, e0];
			let [aa, bb, cc, dd, ee] = [a0, b0, c0, d0, e0];

			// Round 1
			a = f(a, b, c, d, e, x[index +  0], 11, 0); c = rol(c, 10);
			e = f(e, a, b, c, d, x[index +  1], 14, 0); b = rol(b, 10);
			d = f(d, e, a, b, c, x[index +  2], 15, 0); a = rol(a, 10);
			c = f(c, d, e, a, b, x[index +  3], 12, 0); e = rol(e, 10);
			b = f(b, c, d, e, a, x[index +  4],  5, 0); d = rol(d, 10);
			a = f(a, b, c, d, e, x[index +  5],  8, 0); c = rol(c, 10);
			e = f(e, a, b, c, d, x[index +  6],  7, 0); b = rol(b, 10);
			d = f(d, e, a, b, c, x[index +  7],  9, 0); a = rol(a, 10);
			c = f(c, d, e, a, b, x[index +  8], 11, 0); e = rol(e, 10);
			b = f(b, c, d, e, a, x[index +  9], 13, 0); d = rol(d, 10);
			a = f(a, b, c, d, e, x[index + 10], 14, 0); c = rol(c, 10);
			e = f(e, a, b, c, d, x[index + 11], 15, 0); b = rol(b, 10);
			d = f(d, e, a, b, c, x[index + 12],  6, 0); a = rol(a, 10);
			c = f(c, d, e, a, b, x[index + 13],  7, 0); e = rol(e, 10);
			b = f(b, c, d, e, a, x[index + 14],  9, 0); d = rol(d, 10);
			a = f(a, b, c, d, e, x[index + 15],  8, 0); c = rol(c, 10);

			// Round 2
			e = g(e, a, b, c, d, x[index +  7],  7, SQRT2_DIV4); b = rol(b, 10);
			d = g(d, e, a, b, c, x[index +  4],  6, SQRT2_DIV4); a = rol(a, 10);
			c = g(c, d, e, a, b, x[index + 13],  8, SQRT2_DIV4); e = rol(e, 10);
			b = g(b, c, d, e, a, x[index +  1], 13, SQRT2_DIV4); d = rol(d, 10);
			a = g(a, b, c, d, e, x[index + 10], 11, SQRT2_DIV4); c = rol(c, 10);
			e = g(e, a, b, c, d, x[index +  6],  9, SQRT2_DIV4); b = rol(b, 10);
			d = g(d, e, a, b, c, x[index + 15],  7, SQRT2_DIV4); a = rol(a, 10);
			c = g(c, d, e, a, b, x[index +  3], 15, SQRT2_DIV4); e = rol(e, 10);
			b = g(b, c, d, e, a, x[index + 12],  7, SQRT2_DIV4); d = rol(d, 10);
			a = g(a, b, c, d, e, x[index +  0], 12, SQRT2_DIV4); c = rol(c, 10);
			e = g(e, a, b, c, d, x[index +  9], 15, SQRT2_DIV4); b = rol(b, 10);
			d = g(d, e, a, b, c, x[index +  5],  9, SQRT2_DIV4); a = rol(a, 10);
			c = g(c, d, e, a, b, x[index +  2], 11, SQRT2_DIV4); e = rol(e, 10);
			b = g(b, c, d, e, a, x[index + 14],  7, SQRT2_DIV4); d = rol(d, 10);
			a = g(a, b, c, d, e, x[index + 11], 13, SQRT2_DIV4); c = rol(c, 10);
			e = g(e, a, b, c, d, x[index +  8], 12, SQRT2_DIV4); b = rol(b, 10);

			// Round 3
			d = h(d, e, a, b, c, x[index +  3], 11, SQRT3_DIV4); a = rol(a, 10);
			c = h(c, d, e, a, b, x[index + 10], 13, SQRT3_DIV4); e = rol(e, 10);
			b = h(b, c, d, e, a, x[index + 14],  6, SQRT3_DIV4); d = rol(d, 10);
			a = h(a, b, c, d, e, x[index +  4],  7, SQRT3_DIV4); c = rol(c, 10);
			e = h(e, a, b, c, d, x[index +  9], 14, SQRT3_DIV4); b = rol(b, 10);
			d = h(d, e, a, b, c, x[index + 15],  9, SQRT3_DIV4); a = rol(a, 10);
			c = h(c, d, e, a, b, x[index +  8], 13, SQRT3_DIV4); e = rol(e, 10);
			b = h(b, c, d, e, a, x[index +  1], 15, SQRT3_DIV4); d = rol(d, 10);
			a = h(a, b, c, d, e, x[index +  2], 14, SQRT3_DIV4); c = rol(c, 10);
			e = h(e, a, b, c, d, x[index +  7],  8, SQRT3_DIV4); b = rol(b, 10);
			d = h(d, e, a, b, c, x[index +  0], 13, SQRT3_DIV4); a = rol(a, 10);
			c = h(c, d, e, a, b, x[index +  6],  6, SQRT3_DIV4); e = rol(e, 10);
			b = h(b, c, d, e, a, x[index + 13],  5, SQRT3_DIV4); d = rol(d, 10);
			a = h(a, b, c, d, e, x[index + 11], 12, SQRT3_DIV4); c = rol(c, 10);
			e = h(e, a, b, c, d, x[index +  5],  7, SQRT3_DIV4); b = rol(b, 10);
			d = h(d, e, a, b, c, x[index + 12],  5, SQRT3_DIV4); a = rol(a, 10);

			// Round 4
			c = i(c, d, e, a, b, x[index +  1], 11, SQRT5_DIV4); e = rol(e, 10);
			b = i(b, c, d, e, a, x[index +  9], 12, SQRT5_DIV4); d = rol(d, 10);
			a = i(a, b, c, d, e, x[index + 11], 14, SQRT5_DIV4); c = rol(c, 10);
			e = i(e, a, b, c, d, x[index + 10], 15, SQRT5_DIV4); b = rol(b, 10);
			d = i(d, e, a, b, c, x[index +  0], 14, SQRT5_DIV4); a = rol(a, 10);
			c = i(c, d, e, a, b, x[index +  8], 15, SQRT5_DIV4); e = rol(e, 10);
			b = i(b, c, d, e, a, x[index + 12],  9, SQRT5_DIV4); d = rol(d, 10);
			a = i(a, b, c, d, e, x[index +  4],  8, SQRT5_DIV4); c = rol(c, 10);
			e = i(e, a, b, c, d, x[index + 13],  9, SQRT5_DIV4); b = rol(b, 10);
			d = i(d, e, a, b, c, x[index +  3], 14, SQRT5_DIV4); a = rol(a, 10);
			c = i(c, d, e, a, b, x[index +  7],  5, SQRT5_DIV4); e = rol(e, 10);
			b = i(b, c, d, e, a, x[index + 15],  6, SQRT5_DIV4); d = rol(d, 10);
			a = i(a, b, c, d, e, x[index + 14],  8, SQRT5_DIV4); c = rol(c, 10);
			e = i(e, a, b, c, d, x[index +  5],  6, SQRT5_DIV4); b = rol(b, 10);
			d = i(d, e, a, b, c, x[index +  6],  5, SQRT5_DIV4); a = rol(a, 10);
			c = i(c, d, e, a, b, x[index +  2], 12, SQRT5_DIV4); e = rol(e, 10);

			// Round 5
			b = j(b, c, d, e, a, x[index +  4],  9, SQRT7_DIV4); d = rol(d, 10);
			a = j(a, b, c, d, e, x[index +  0], 15, SQRT7_DIV4); c = rol(c, 10);
			e = j(e, a, b, c, d, x[index +  5],  5, SQRT7_DIV4); b = rol(b, 10);
			d = j(d, e, a, b, c, x[index +  9], 11, SQRT7_DIV4); a = rol(a, 10);
			c = j(c, d, e, a, b, x[index +  7],  6, SQRT7_DIV4); e = rol(e, 10);
			b = j(b, c, d, e, a, x[index + 12],  8, SQRT7_DIV4); d = rol(d, 10);
			a = j(a, b, c, d, e, x[index +  2], 13, SQRT7_DIV4); c = rol(c, 10);
			e = j(e, a, b, c, d, x[index + 10], 12, SQRT7_DIV4); b = rol(b, 10);
			d = j(d, e, a, b, c, x[index + 14],  5, SQRT7_DIV4); a = rol(a, 10);
			c = j(c, d, e, a, b, x[index +  1], 12, SQRT7_DIV4); e = rol(e, 10);
			b = j(b, c, d, e, a, x[index +  3], 13, SQRT7_DIV4); d = rol(d, 10);
			a = j(a, b, c, d, e, x[index +  8], 14, SQRT7_DIV4); c = rol(c, 10);
			e = j(e, a, b, c, d, x[index + 11], 11, SQRT7_DIV4); b = rol(b, 10);
			d = j(d, e, a, b, c, x[index +  6],  8, SQRT7_DIV4); a = rol(a, 10);
			c = j(c, d, e, a, b, x[index + 15],  5, SQRT7_DIV4); e = rol(e, 10);
			b = j(b, c, d, e, a, x[index + 13],  6, SQRT7_DIV4); d = rol(d, 10);

			// Parallel Round 1
			aa = j(aa, bb, cc, dd, ee, x[index +  5],  8, CBRT2_DIV4); cc = rol(cc, 10);
			ee = j(ee, aa, bb, cc, dd, x[index + 14],  9, CBRT2_DIV4); bb = rol(bb, 10);
			dd = j(dd, ee, aa, bb, cc, x[index +  7],  9, CBRT2_DIV4); aa = rol(aa, 10);
			cc = j(cc, dd, ee, aa, bb, x[index +  0], 11, CBRT2_DIV4); ee = rol(ee, 10);
			bb = j(bb, cc, dd, ee, aa, x[index +  9], 13, CBRT2_DIV4); dd = rol(dd, 10);
			aa = j(aa, bb, cc, dd, ee, x[index +  2], 15, CBRT2_DIV4); cc = rol(cc, 10);
			ee = j(ee, aa, bb, cc, dd, x[index + 11], 15, CBRT2_DIV4); bb = rol(bb, 10);
			dd = j(dd, ee, aa, bb, cc, x[index +  4],  5, CBRT2_DIV4); aa = rol(aa, 10);
			cc = j(cc, dd, ee, aa, bb, x[index + 13],  7, CBRT2_DIV4); ee = rol(ee, 10);
			bb = j(bb, cc, dd, ee, aa, x[index +  6],  7, CBRT2_DIV4); dd = rol(dd, 10);
			aa = j(aa, bb, cc, dd, ee, x[index + 15],  8, CBRT2_DIV4); cc = rol(cc, 10);
			ee = j(ee, aa, bb, cc, dd, x[index +  8], 11, CBRT2_DIV4); bb = rol(bb, 10);
			dd = j(dd, ee, aa, bb, cc, x[index +  1], 14, CBRT2_DIV4); aa = rol(aa, 10);
			cc = j(cc, dd, ee, aa, bb, x[index + 10], 14, CBRT2_DIV4); ee = rol(ee, 10);
			bb = j(bb, cc, dd, ee, aa, x[index +  3], 12, CBRT2_DIV4); dd = rol(dd, 10);
			aa = j(aa, bb, cc, dd, ee, x[index + 12],  6, CBRT2_DIV4); cc = rol(cc, 10);

			// Parallel Round 2
			ee = i(ee, aa, bb, cc, dd, x[index +  6],  9, CBRT3_DIV4); bb = rol(bb, 10);
			dd = i(dd, ee, aa, bb, cc, x[index + 11], 13, CBRT3_DIV4); aa = rol(aa, 10);
			cc = i(cc, dd, ee, aa, bb, x[index +  3], 15, CBRT3_DIV4); ee = rol(ee, 10);
			bb = i(bb, cc, dd, ee, aa, x[index +  7],  7, CBRT3_DIV4); dd = rol(dd, 10);
			aa = i(aa, bb, cc, dd, ee, x[index +  0], 12, CBRT3_DIV4); cc = rol(cc, 10);
			ee = i(ee, aa, bb, cc, dd, x[index + 13],  8, CBRT3_DIV4); bb = rol(bb, 10);
			dd = i(dd, ee, aa, bb, cc, x[index +  5],  9, CBRT3_DIV4); aa = rol(aa, 10);
			cc = i(cc, dd, ee, aa, bb, x[index + 10], 11, CBRT3_DIV4); ee = rol(ee, 10);
			bb = i(bb, cc, dd, ee, aa, x[index + 14],  7, CBRT3_DIV4); dd = rol(dd, 10);
			aa = i(aa, bb, cc, dd, ee, x[index + 15],  7, CBRT3_DIV4); cc = rol(cc, 10);
			ee = i(ee, aa, bb, cc, dd, x[index +  8], 12, CBRT3_DIV4); bb = rol(bb, 10);
			dd = i(dd, ee, aa, bb, cc, x[index + 12],  7, CBRT3_DIV4); aa = rol(aa, 10);
			cc = i(cc, dd, ee, aa, bb, x[index +  4],  6, CBRT3_DIV4); ee = rol(ee, 10);
			bb = i(bb, cc, dd, ee, aa, x[index +  9], 15, CBRT3_DIV4); dd = rol(dd, 10);
			aa = i(aa, bb, cc, dd, ee, x[index +  1], 13, CBRT3_DIV4); cc = rol(cc, 10);
			ee = i(ee, aa, bb, cc, dd, x[index +  2], 11, CBRT3_DIV4); bb = rol(bb, 10);

			// Parallel Round 3
			dd = h(dd, ee, aa, bb, cc, x[index + 15],  9, CBRT5_DIV4); aa = rol(aa, 10);
			cc = h(cc, dd, ee, aa, bb, x[index +  5],  7, CBRT5_DIV4); ee = rol(ee, 10);
			bb = h(bb, cc, dd, ee, aa, x[index +  1], 15, CBRT5_DIV4); dd = rol(dd, 10);
			aa = h(aa, bb, cc, dd, ee, x[index +  3], 11, CBRT5_DIV4); cc = rol(cc, 10);
			ee = h(ee, aa, bb, cc, dd, x[index +  7],  8, CBRT5_DIV4); bb = rol(bb, 10);
			dd = h(dd, ee, aa, bb, cc, x[index + 14],  6, CBRT5_DIV4); aa = rol(aa, 10);
			cc = h(cc, dd, ee, aa, bb, x[index +  6],  6, CBRT5_DIV4); ee = rol(ee, 10);
			bb = h(bb, cc, dd, ee, aa, x[index +  9], 14, CBRT5_DIV4); dd = rol(dd, 10);
			aa = h(aa, bb, cc, dd, ee, x[index + 11], 12, CBRT5_DIV4); cc = rol(cc, 10);
			ee = h(ee, aa, bb, cc, dd, x[index +  8], 13, CBRT5_DIV4); bb = rol(bb, 10);
			dd = h(dd, ee, aa, bb, cc, x[index + 12],  5, CBRT5_DIV4); aa = rol(aa, 10);
			cc = h(cc, dd, ee, aa, bb, x[index +  2], 14, CBRT5_DIV4); ee = rol(ee, 10);
			bb = h(bb, cc, dd, ee, aa, x[index + 10], 13, CBRT5_DIV4); dd = rol(dd, 10);
			aa = h(aa, bb, cc, dd, ee, x[index +  0], 13, CBRT5_DIV4); cc = rol(cc, 10);
			ee = h(ee, aa, bb, cc, dd, x[index +  4],  7, CBRT5_DIV4); bb = rol(bb, 10);
			dd = h(dd, ee, aa, bb, cc, x[index + 13],  5, CBRT5_DIV4); aa = rol(aa, 10);

			// Parallel Round 4
			cc = g(cc, dd, ee, aa, bb, x[index +  8], 15, CBRT7_DIV4); ee = rol(ee, 10);
			bb = g(bb, cc, dd, ee, aa, x[index +  6],  5, CBRT7_DIV4); dd = rol(dd, 10);
			aa = g(aa, bb, cc, dd, ee, x[index +  4],  8, CBRT7_DIV4); cc = rol(cc, 10);
			ee = g(ee, aa, bb, cc, dd, x[index +  1], 11, CBRT7_DIV4); bb = rol(bb, 10);
			dd = g(dd, ee, aa, bb, cc, x[index +  3], 14, CBRT7_DIV4); aa = rol(aa, 10);
			cc = g(cc, dd, ee, aa, bb, x[index + 11], 14, CBRT7_DIV4); ee = rol(ee, 10);
			bb = g(bb, cc, dd, ee, aa, x[index + 15],  6, CBRT7_DIV4); dd = rol(dd, 10);
			aa = g(aa, bb, cc, dd, ee, x[index +  0], 14, CBRT7_DIV4); cc = rol(cc, 10);
			ee = g(ee, aa, bb, cc, dd, x[index +  5],  6, CBRT7_DIV4); bb = rol(bb, 10);
			dd = g(dd, ee, aa, bb, cc, x[index + 12],  9, CBRT7_DIV4); aa = rol(aa, 10);
			cc = g(cc, dd, ee, aa, bb, x[index +  2], 12, CBRT7_DIV4); ee = rol(ee, 10);
			bb = g(bb, cc, dd, ee, aa, x[index + 13],  9, CBRT7_DIV4); dd = rol(dd, 10);
			aa = g(aa, bb, cc, dd, ee, x[index +  9], 12, CBRT7_DIV4); cc = rol(cc, 10);
			ee = g(ee, aa, bb, cc, dd, x[index +  7],  5, CBRT7_DIV4); bb = rol(bb, 10);
			dd = g(dd, ee, aa, bb, cc, x[index + 10], 15, CBRT7_DIV4); aa = rol(aa, 10);
			cc = g(cc, dd, ee, aa, bb, x[index + 14],  8, CBRT7_DIV4); ee = rol(ee, 10);

			// Parallel Round 5
			bb = f(bb, cc, dd, ee, aa, x[index + 12],  8, 0); dd = rol(dd, 10);
			aa = f(aa, bb, cc, dd, ee, x[index + 15],  5, 0); cc = rol(cc, 10);
			ee = f(ee, aa, bb, cc, dd, x[index + 10], 12, 0); bb = rol(bb, 10);
			dd = f(dd, ee, aa, bb, cc, x[index +  4],  9, 0); aa = rol(aa, 10);
			cc = f(cc, dd, ee, aa, bb, x[index +  1], 12, 0); ee = rol(ee, 10);
			bb = f(bb, cc, dd, ee, aa, x[index +  5],  5, 0); dd = rol(dd, 10);
			aa = f(aa, bb, cc, dd, ee, x[index +  8], 14, 0); cc = rol(cc, 10);
			ee = f(ee, aa, bb, cc, dd, x[index +  7],  6, 0); bb = rol(bb, 10);
			dd = f(dd, ee, aa, bb, cc, x[index +  6],  8, 0); aa = rol(aa, 10);
			cc = f(cc, dd, ee, aa, bb, x[index +  2], 13, 0); ee = rol(ee, 10);
			bb = f(bb, cc, dd, ee, aa, x[index + 13],  6, 0); dd = rol(dd, 10);
			aa = f(aa, bb, cc, dd, ee, x[index + 14],  5, 0); cc = rol(cc, 10);
			ee = f(ee, aa, bb, cc, dd, x[index +  0], 15, 0); bb = rol(bb, 10);
			dd = f(dd, ee, aa, bb, cc, x[index +  3], 13, 0); aa = rol(aa, 10);
			cc = f(cc, dd, ee, aa, bb, x[index +  9], 11, 0); ee = rol(ee, 10);
			bb = f(bb, cc, dd, ee, aa, x[index + 11], 11, 0); dd = rol(dd, 10);

			dd = add(b0, c, dd);
			b0 = add(c0, d, ee);
			c0 = add(d0, e, aa);
			d0 = add(e0, a, bb);
			e0 = add(a0, b, cc);
			a0 = dd;
		}

		return int32sToBytesLE([a0, b0, c0, d0, e0]);
	}
}

export {
	RipeMd160Transform
};