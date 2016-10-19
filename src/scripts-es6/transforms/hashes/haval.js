import { Transform } from "../transforms";
import { int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";
import { add } from "../../cryptopunk.bitarith";

const HAVAL_VERSION = 1;

const PASSES_VALUES = {
	"3": 3,
	"4": 4,
	"5": 5
};

const LENGTH_VALUES = {
	"128": 128,
	"160": 160,
	"192": 192,
	"224": 224,
	"256": 256
};

function f1(x6, x5, x4, x3, x2, x1, x0)
{
	return x1 & (x0 ^ x4) ^ x2 & x5 ^ x3 & x6 ^ x0;
}

function f2(x6, x5, x4, x3, x2, x1, x0)
{
	return x2 & (x1 & (~x3) ^ x4 & x5 ^ x6 ^ x0) ^ x4 & (x1 ^ x5) ^ x3 & x5 ^ x0;
}

function f3(x6, x5, x4, x3, x2, x1, x0)
{
	return x3 & (x1 & x2 ^ x6 ^ x0) ^ x1 & x4 ^ x2 & x5 ^ x0;
}

function f4(x6, x5, x4, x3, x2, x1, x0)
{
	return x4 & (x5 & ~x2 ^ x3 & (~x6) ^ x1 ^ x6 ^ x0) ^ x3 & (x1 & x2 ^ x5 ^ x6) ^ x2 & x6 ^ x0;
}

function f5(x6, x5, x4, x3, x2, x1, x0)
{
	return x0 & (x1 & x2 & x3 ^ (~x5)) ^ x1 & x4 ^ x2 & x5 ^ x3 & x6;
}

function ff1_3(x7, x6, x5, x4, x3, x2, x1, x0, w)
{
	const t = f1(x1, x0, x3, x5, x6, x2, x4);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w);
}

function ff1_4(x7, x6, x5, x4, x3, x2, x1, x0, w)
{
	const t = f1(x2, x6, x1, x4, x5, x3, x0);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w);
}

function ff1_5(x7, x6, x5, x4, x3, x2, x1, x0, w)
{
	const t = f1(x3, x4, x1, x0, x5, x2, x6);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w);
}

function ff2_3(x7, x6, x5, x4, x3, x2, x1, x0, w, c)
{
	const t = f2(x4, x2, x1, x0, x5, x3, x6);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w, c);
}

function ff2_4(x7, x6, x5, x4, x3, x2, x1, x0, w, c)
{
	const t = f2(x3, x5, x2, x0, x1, x6, x4);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w, c);
}

function ff2_5(x7, x6, x5, x4, x3, x2, x1, x0, w, c)
{
	const t = f2(x6, x2, x1, x0, x3, x4, x5);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w, c);
}

function ff3_3(x7, x6, x5, x4, x3, x2, x1, x0, w, c)
{
	const t = f3(x6, x1, x2, x3, x4, x5, x0);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w, c);
}

function ff3_4(x7, x6, x5, x4, x3, x2, x1, x0, w, c)
{
	const t = f3(x1, x4, x3, x6, x0, x2, x5);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w, c);
}

function ff3_5(x7, x6, x5, x4, x3, x2, x1, x0, w, c)
{
	const t = f3(x2, x6, x0, x4, x3, x1, x5);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w, c);
}

function ff4_4(x7, x6, x5, x4, x3, x2, x1, x0, w, c)
{
	const t = f4(x6, x4, x0, x5, x2, x1, x3);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w,  c);
}

function ff4_5(x7, x6, x5, x4, x3, x2, x1, x0, w, c)
{
	const t = f4(x1, x5, x3, x2, x0, x4, x6);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w,  c);
}

function ff5_5(x7, x6, x5, x4, x3, x2, x1, x0, w, c)
{
	let t = f5(x2, x5, x0, x6, x4, x3, x1);
	return add((t >>> 7 | t << 25) + (x7 >>> 11 | x7 << 21), w, c);
}

class HavalTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Output")
			.addOption("passes", "Passes", 5, { type: "select", values: PASSES_VALUES })
			.addOption("length", "Length", 128, { type: "select", values: LENGTH_VALUES });
	}

	padMessage(bytes, options)
	{
		let paddingLength = bytes.length % 128;
		paddingLength = (paddingLength < 118 ? 118 : 246) - paddingLength;
		const result = new Uint8Array(bytes.length + paddingLength + 10);
		// Copy message to new array:
		result.set(bytes);

		result[bytes.length] = 1;

		// Version number, round count, hash length (last 3 bits) and bit length of message are stored in
		// the last 10 bytes after the padding:
		let index = bytes.length + paddingLength;
		const info = HAVAL_VERSION | (options.passes << 3) | (options.length << 6);
		result[index++] = info & 0xff;
		result[index++] = info >>> 8;

		// Like MD4/MD5/SHA, we only store the size up to 2^32 bits. Little endian
		const bitLengthLo = bytes.length << 3;
		const bitLengthHi = bytes.length >>> 29;
		result.set(int32sToBytesLE([bitLengthLo, bitLengthHi]), index);
		return result;
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		const x = bytesToInt32sLE(this.padMessage(bytes, options));

		let h0 = 0x243f6a88;
		let h1 = 0x85a308d3;
		let h2 = 0x13198a2e;
		let h3 = 0x03707344;
		let h4 = 0xa4093822;
		let h5 = 0x299f31d0;
		let h6 = 0x082efa98;
		let h7 = 0xec4e6c89;

		let ff1, ff2, ff3, ff4, ff5;
		switch (options.passes)
		{
			case 3:
				ff1 = ff1_3;
				ff2 = ff2_3;
				ff3 = ff3_3;
				break;
			case 4:
				ff1 = ff1_4;
				ff2 = ff2_4;
				ff3 = ff3_4;
				ff4 = ff4_4;
				break;
			default:
				ff1 = ff1_5;
				ff2 = ff2_5;
				ff3 = ff3_5;
				ff4 = ff4_5;
				ff5 = ff5_5;
				break;
		}

		for (let index = 0; index < x.length; index += 32)
		{
			let [t0, t1, t2, t3, t4, t5, t6, t7] = [h0, h1, h2, h3, h4, h5, h6, h7];

			// Pass 1
			t7 = ff1(t7, t6, t5, t4, t3, t2, t1, t0, x[ 0]);
			t6 = ff1(t6, t5, t4, t3, t2, t1, t0, t7, x[ 1]);
			t5 = ff1(t5, t4, t3, t2, t1, t0, t7, t6, x[ 2]);
			t4 = ff1(t4, t3, t2, t1, t0, t7, t6, t5, x[ 3]);
			t3 = ff1(t3, t2, t1, t0, t7, t6, t5, t4, x[ 4]);
			t2 = ff1(t2, t1, t0, t7, t6, t5, t4, t3, x[ 5]);
			t1 = ff1(t1, t0, t7, t6, t5, t4, t3, t2, x[ 6]);
			t0 = ff1(t0, t7, t6, t5, t4, t3, t2, t1, x[ 7]);

			t7 = ff1(t7, t6, t5, t4, t3, t2, t1, t0, x[ 8]);
			t6 = ff1(t6, t5, t4, t3, t2, t1, t0, t7, x[ 9]);
			t5 = ff1(t5, t4, t3, t2, t1, t0, t7, t6, x[10]);
			t4 = ff1(t4, t3, t2, t1, t0, t7, t6, t5, x[11]);
			t3 = ff1(t3, t2, t1, t0, t7, t6, t5, t4, x[12]);
			t2 = ff1(t2, t1, t0, t7, t6, t5, t4, t3, x[13]);
			t1 = ff1(t1, t0, t7, t6, t5, t4, t3, t2, x[14]);
			t0 = ff1(t0, t7, t6, t5, t4, t3, t2, t1, x[15]);

			t7 = ff1(t7, t6, t5, t4, t3, t2, t1, t0, x[16]);
			t6 = ff1(t6, t5, t4, t3, t2, t1, t0, t7, x[17]);
			t5 = ff1(t5, t4, t3, t2, t1, t0, t7, t6, x[18]);
			t4 = ff1(t4, t3, t2, t1, t0, t7, t6, t5, x[19]);
			t3 = ff1(t3, t2, t1, t0, t7, t6, t5, t4, x[20]);
			t2 = ff1(t2, t1, t0, t7, t6, t5, t4, t3, x[21]);
			t1 = ff1(t1, t0, t7, t6, t5, t4, t3, t2, x[22]);
			t0 = ff1(t0, t7, t6, t5, t4, t3, t2, t1, x[23]);

			t7 = ff1(t7, t6, t5, t4, t3, t2, t1, t0, x[24]);
			t6 = ff1(t6, t5, t4, t3, t2, t1, t0, t7, x[25]);
			t5 = ff1(t5, t4, t3, t2, t1, t0, t7, t6, x[26]);
			t4 = ff1(t4, t3, t2, t1, t0, t7, t6, t5, x[27]);
			t3 = ff1(t3, t2, t1, t0, t7, t6, t5, t4, x[28]);
			t2 = ff1(t2, t1, t0, t7, t6, t5, t4, t3, x[29]);
			t1 = ff1(t1, t0, t7, t6, t5, t4, t3, t2, x[30]);
			t0 = ff1(t0, t7, t6, t5, t4, t3, t2, t1, x[31]);

			// Pass 2
			t7 = ff2(t7, t6, t5, t4, t3, t2, t1, t0, x[ 5], 0x452821e6);
			t6 = ff2(t6, t5, t4, t3, t2, t1, t0, t7, x[14], 0x38d01377);
			t5 = ff2(t5, t4, t3, t2, t1, t0, t7, t6, x[26], 0xbe5466cf);
			t4 = ff2(t4, t3, t2, t1, t0, t7, t6, t5, x[18], 0x34e90c6c);
			t3 = ff2(t3, t2, t1, t0, t7, t6, t5, t4, x[11], 0xc0ac29b7);
			t2 = ff2(t2, t1, t0, t7, t6, t5, t4, t3, x[28], 0xc97c50dd);
			t1 = ff2(t1, t0, t7, t6, t5, t4, t3, t2, x[ 7], 0x3f84d5b5);
			t0 = ff2(t0, t7, t6, t5, t4, t3, t2, t1, x[16], 0xb5470917);

			t7 = ff2(t7, t6, t5, t4, t3, t2, t1, t0, x[ 0], 0x9216d5d9);
			t6 = ff2(t6, t5, t4, t3, t2, t1, t0, t7, x[23], 0x8979fb1b);
			t5 = ff2(t5, t4, t3, t2, t1, t0, t7, t6, x[20], 0xd1310ba6);
			t4 = ff2(t4, t3, t2, t1, t0, t7, t6, t5, x[22], 0x98dfb5ac);
			t3 = ff2(t3, t2, t1, t0, t7, t6, t5, t4, x[ 1], 0x2ffd72db);
			t2 = ff2(t2, t1, t0, t7, t6, t5, t4, t3, x[10], 0xd01adfb7);
			t1 = ff2(t1, t0, t7, t6, t5, t4, t3, t2, x[ 4], 0xb8e1afed);
			t0 = ff2(t0, t7, t6, t5, t4, t3, t2, t1, x[ 8], 0x6a267e96);

			t7 = ff2(t7, t6, t5, t4, t3, t2, t1, t0, x[30], 0xba7c9045);
			t6 = ff2(t6, t5, t4, t3, t2, t1, t0, t7, x[ 3], 0xf12c7f99);
			t5 = ff2(t5, t4, t3, t2, t1, t0, t7, t6, x[21], 0x24a19947);
			t4 = ff2(t4, t3, t2, t1, t0, t7, t6, t5, x[ 9], 0xb3916cf7);
			t3 = ff2(t3, t2, t1, t0, t7, t6, t5, t4, x[17], 0x0801f2e2);
			t2 = ff2(t2, t1, t0, t7, t6, t5, t4, t3, x[24], 0x858efc16);
			t1 = ff2(t1, t0, t7, t6, t5, t4, t3, t2, x[29], 0x636920d8);
			t0 = ff2(t0, t7, t6, t5, t4, t3, t2, t1, x[ 6], 0x71574e69);

			t7 = ff2(t7, t6, t5, t4, t3, t2, t1, t0, x[19], 0xa458fea3);
			t6 = ff2(t6, t5, t4, t3, t2, t1, t0, t7, x[12], 0xf4933d7e);
			t5 = ff2(t5, t4, t3, t2, t1, t0, t7, t6, x[15], 0x0d95748f);
			t4 = ff2(t4, t3, t2, t1, t0, t7, t6, t5, x[13], 0x728eb658);
			t3 = ff2(t3, t2, t1, t0, t7, t6, t5, t4, x[ 2], 0x718bcd58);
			t2 = ff2(t2, t1, t0, t7, t6, t5, t4, t3, x[25], 0x82154aee);
			t1 = ff2(t1, t0, t7, t6, t5, t4, t3, t2, x[31], 0x7b54a41d);
			t0 = ff2(t0, t7, t6, t5, t4, t3, t2, t1, x[27], 0xc25a59b5);

			// Pass 3
			t7 = ff3(t7, t6, t5, t4, t3, t2, t1, t0, x[19], 0x9c30d539);
			t6 = ff3(t6, t5, t4, t3, t2, t1, t0, t7, x[ 9], 0x2af26013);
			t5 = ff3(t5, t4, t3, t2, t1, t0, t7, t6, x[ 4], 0xc5d1b023);
			t4 = ff3(t4, t3, t2, t1, t0, t7, t6, t5, x[20], 0x286085f0);
			t3 = ff3(t3, t2, t1, t0, t7, t6, t5, t4, x[28], 0xca417918);
			t2 = ff3(t2, t1, t0, t7, t6, t5, t4, t3, x[17], 0xb8db38ef);
			t1 = ff3(t1, t0, t7, t6, t5, t4, t3, t2, x[ 8], 0x8e79dcb0);
			t0 = ff3(t0, t7, t6, t5, t4, t3, t2, t1, x[22], 0x603a180e);

			t7 = ff3(t7, t6, t5, t4, t3, t2, t1, t0, x[29], 0x6c9e0e8b);
			t6 = ff3(t6, t5, t4, t3, t2, t1, t0, t7, x[14], 0xb01e8a3e);
			t5 = ff3(t5, t4, t3, t2, t1, t0, t7, t6, x[25], 0xd71577c1);
			t4 = ff3(t4, t3, t2, t1, t0, t7, t6, t5, x[12], 0xbd314b27);
			t3 = ff3(t3, t2, t1, t0, t7, t6, t5, t4, x[24], 0x78af2fda);
			t2 = ff3(t2, t1, t0, t7, t6, t5, t4, t3, x[30], 0x55605c60);
			t1 = ff3(t1, t0, t7, t6, t5, t4, t3, t2, x[16], 0xe65525f3);
			t0 = ff3(t0, t7, t6, t5, t4, t3, t2, t1, x[26], 0xaa55ab94);

			t7 = ff3(t7, t6, t5, t4, t3, t2, t1, t0, x[31], 0x57489862);
			t6 = ff3(t6, t5, t4, t3, t2, t1, t0, t7, x[15], 0x63e81440);
			t5 = ff3(t5, t4, t3, t2, t1, t0, t7, t6, x[ 7], 0x55ca396a);
			t4 = ff3(t4, t3, t2, t1, t0, t7, t6, t5, x[ 3], 0x2aab10b6);
			t3 = ff3(t3, t2, t1, t0, t7, t6, t5, t4, x[ 1], 0xb4cc5c34);
			t2 = ff3(t2, t1, t0, t7, t6, t5, t4, t3, x[ 0], 0x1141e8ce);
			t1 = ff3(t1, t0, t7, t6, t5, t4, t3, t2, x[18], 0xa15486af);
			t0 = ff3(t0, t7, t6, t5, t4, t3, t2, t1, x[27], 0x7c72e993);

			t7 = ff3(t7, t6, t5, t4, t3, t2, t1, t0, x[13], 0xb3ee1411);
			t6 = ff3(t6, t5, t4, t3, t2, t1, t0, t7, x[ 6], 0x636fbc2a);
			t5 = ff3(t5, t4, t3, t2, t1, t0, t7, t6, x[21], 0x2ba9c55d);
			t4 = ff3(t4, t3, t2, t1, t0, t7, t6, t5, x[10], 0x741831f6);
			t3 = ff3(t3, t2, t1, t0, t7, t6, t5, t4, x[23], 0xce5c3e16);
			t2 = ff3(t2, t1, t0, t7, t6, t5, t4, t3, x[11], 0x9b87931e);
			t1 = ff3(t1, t0, t7, t6, t5, t4, t3, t2, x[ 5], 0xafd6ba33);
			t0 = ff3(t0, t7, t6, t5, t4, t3, t2, t1, x[ 2], 0x6c24cf5c);

			if (options.passes >= 4)
			{
				t7 = ff4(t7, t6, t5, t4, t3, t2, t1, t0, x[24], 0x7a325381);
				t6 = ff4(t6, t5, t4, t3, t2, t1, t0, t7, x[ 4], 0x28958677);
				t5 = ff4(t5, t4, t3, t2, t1, t0, t7, t6, x[ 0], 0x3b8f4898);
				t4 = ff4(t4, t3, t2, t1, t0, t7, t6, t5, x[14], 0x6b4bb9af);
				t3 = ff4(t3, t2, t1, t0, t7, t6, t5, t4, x[ 2], 0xc4bfe81b);
				t2 = ff4(t2, t1, t0, t7, t6, t5, t4, t3, x[ 7], 0x66282193);
				t1 = ff4(t1, t0, t7, t6, t5, t4, t3, t2, x[28], 0x61d809cc);
				t0 = ff4(t0, t7, t6, t5, t4, t3, t2, t1, x[23], 0xfb21a991);

				t7 = ff4(t7, t6, t5, t4, t3, t2, t1, t0, x[26], 0x487cac60);
				t6 = ff4(t6, t5, t4, t3, t2, t1, t0, t7, x[ 6], 0x5dec8032);
				t5 = ff4(t5, t4, t3, t2, t1, t0, t7, t6, x[30], 0xef845d5d);
				t4 = ff4(t4, t3, t2, t1, t0, t7, t6, t5, x[20], 0xe98575b1);
				t3 = ff4(t3, t2, t1, t0, t7, t6, t5, t4, x[18], 0xdc262302);
				t2 = ff4(t2, t1, t0, t7, t6, t5, t4, t3, x[25], 0xeb651b88);
				t1 = ff4(t1, t0, t7, t6, t5, t4, t3, t2, x[19], 0x23893e81);
				t0 = ff4(t0, t7, t6, t5, t4, t3, t2, t1, x[ 3], 0xd396acc5);

				t7 = ff4(t7, t6, t5, t4, t3, t2, t1, t0, x[22], 0x0f6d6ff3);
				t6 = ff4(t6, t5, t4, t3, t2, t1, t0, t7, x[11], 0x83f44239);
				t5 = ff4(t5, t4, t3, t2, t1, t0, t7, t6, x[31], 0x2e0b4482);
				t4 = ff4(t4, t3, t2, t1, t0, t7, t6, t5, x[21], 0xa4842004);
				t3 = ff4(t3, t2, t1, t0, t7, t6, t5, t4, x[ 8], 0x69c8f04a);
				t2 = ff4(t2, t1, t0, t7, t6, t5, t4, t3, x[27], 0x9e1f9b5e);
				t1 = ff4(t1, t0, t7, t6, t5, t4, t3, t2, x[12], 0x21c66842);
				t0 = ff4(t0, t7, t6, t5, t4, t3, t2, t1, x[ 9], 0xf6e96c9a);

				t7 = ff4(t7, t6, t5, t4, t3, t2, t1, t0, x[ 1], 0x670c9c61);
				t6 = ff4(t6, t5, t4, t3, t2, t1, t0, t7, x[29], 0xabd388f0);
				t5 = ff4(t5, t4, t3, t2, t1, t0, t7, t6, x[ 5], 0x6a51a0d2);
				t4 = ff4(t4, t3, t2, t1, t0, t7, t6, t5, x[15], 0xd8542f68);
				t3 = ff4(t3, t2, t1, t0, t7, t6, t5, t4, x[17], 0x960fa728);
				t2 = ff4(t2, t1, t0, t7, t6, t5, t4, t3, x[10], 0xab5133a3);
				t1 = ff4(t1, t0, t7, t6, t5, t4, t3, t2, x[16], 0x6eef0b6c);
				t0 = ff4(t0, t7, t6, t5, t4, t3, t2, t1, x[13], 0x137a3be4);
			}

			if (options.passes >= 5)
			{
				t7 = ff5(t7, t6, t5, t4, t3, t2, t1, t0, x[27], 0xba3bf050);
				t6 = ff5(t6, t5, t4, t3, t2, t1, t0, t7, x[ 3], 0x7efb2a98);
				t5 = ff5(t5, t4, t3, t2, t1, t0, t7, t6, x[21], 0xa1f1651d);
				t4 = ff5(t4, t3, t2, t1, t0, t7, t6, t5, x[26], 0x39af0176);
				t3 = ff5(t3, t2, t1, t0, t7, t6, t5, t4, x[17], 0x66ca593e);
				t2 = ff5(t2, t1, t0, t7, t6, t5, t4, t3, x[11], 0x82430e88);
				t1 = ff5(t1, t0, t7, t6, t5, t4, t3, t2, x[20], 0x8cee8619);
				t0 = ff5(t0, t7, t6, t5, t4, t3, t2, t1, x[29], 0x456f9fb4);

				t7 = ff5(t7, t6, t5, t4, t3, t2, t1, t0, x[19], 0x7d84a5c3);
				t6 = ff5(t6, t5, t4, t3, t2, t1, t0, t7, x[ 0], 0x3b8b5ebe);
				t5 = ff5(t5, t4, t3, t2, t1, t0, t7, t6, x[12], 0xe06f75d8);
				t4 = ff5(t4, t3, t2, t1, t0, t7, t6, t5, x[ 7], 0x85c12073);
				t3 = ff5(t3, t2, t1, t0, t7, t6, t5, t4, x[13], 0x401a449f);
				t2 = ff5(t2, t1, t0, t7, t6, t5, t4, t3, x[ 8], 0x56c16aa6);
				t1 = ff5(t1, t0, t7, t6, t5, t4, t3, t2, x[31], 0x4ed3aa62);
				t0 = ff5(t0, t7, t6, t5, t4, t3, t2, t1, x[10], 0x363f7706);

				t7 = ff5(t7, t6, t5, t4, t3, t2, t1, t0, x[ 5], 0x1bfedf72);
				t6 = ff5(t6, t5, t4, t3, t2, t1, t0, t7, x[ 9], 0x429b023d);
				t5 = ff5(t5, t4, t3, t2, t1, t0, t7, t6, x[14], 0x37d0d724);
				t4 = ff5(t4, t3, t2, t1, t0, t7, t6, t5, x[30], 0xd00a1248);
				t3 = ff5(t3, t2, t1, t0, t7, t6, t5, t4, x[18], 0xdb0fead3);
				t2 = ff5(t2, t1, t0, t7, t6, t5, t4, t3, x[ 6], 0x49f1c09b);
				t1 = ff5(t1, t0, t7, t6, t5, t4, t3, t2, x[28], 0x075372c9);
				t0 = ff5(t0, t7, t6, t5, t4, t3, t2, t1, x[24], 0x80991b7b);

				t7 = ff5(t7, t6, t5, t4, t3, t2, t1, t0, x[ 2], 0x25d479d8);
				t6 = ff5(t6, t5, t4, t3, t2, t1, t0, t7, x[23], 0xf6e8def7);
				t5 = ff5(t5, t4, t3, t2, t1, t0, t7, t6, x[16], 0xe3fe501a);
				t4 = ff5(t4, t3, t2, t1, t0, t7, t6, t5, x[22], 0xb6794c3b);
				t3 = ff5(t3, t2, t1, t0, t7, t6, t5, t4, x[ 4], 0x976ce0bd);
				t2 = ff5(t2, t1, t0, t7, t6, t5, t4, t3, x[ 1], 0x04c006ba);
				t1 = ff5(t1, t0, t7, t6, t5, t4, t3, t2, x[25], 0xc1a94fb6);
				t0 = ff5(t0, t7, t6, t5, t4, t3, t2, t1, x[15], 0x409f60c4);
			}

			h0 = add(h0, t0);
			h1 = add(h1, t1);
			h2 = add(h2, t2);
			h3 = add(h3, t3);
			h4 = add(h4, t4);
			h5 = add(h5, t5);
			h6 = add(h6, t6);
			h7 = add(h7, t7);
		}

		return this.tailor(h0, h1, h2, h3, h4, h5, h6, h7, options.length);
	}

	tailor(h0, h1, h2, h3, h4, h5, h6, h7, length)
	{
		let temp;
		switch (length)
		{
			case 128:
				temp = (h7 & 0x000000ff) | (h6 & 0xff000000) | (h5 & 0x00ff0000) | (h4 & 0x0000FF00); h0 = add(h0, temp >>>  8 | temp << 24);
				temp = (h7 & 0x0000ff00) | (h6 & 0x000000ff) | (h5 & 0xff000000) | (h4 & 0x00ff0000); h1 = add(h1, temp >>> 16 | temp << 16);
				temp = (h7 & 0x00ff0000) | (h6 & 0x0000ff00) | (h5 & 0x000000ff) | (h4 & 0xff000000); h2 = add(h2, temp >>> 24 | temp <<  8);
				temp = (h7 & 0xff000000) | (h6 & 0x00ff0000) | (h5 & 0x0000ff00) | (h4 & 0x000000ff); h3 = add(h3, temp);
				return int32sToBytesLE([h0, h1, h2, h3]);
			case 160:
				temp = (h7 &  0x3f      )  | (h6 & (0x7f << 25)) | (h5 & (0x3f << 19)); h0 = add(h0, temp >>> 19 | temp << 13);
				temp = (h7 & (0x3f <<  6)) | (h6 &  0x3f       ) | (h5 & (0x7f << 25)); h1 = add(h1, temp >>> 25 | temp <<  7);
				temp = (h7 & (0x7f << 12)) | (h6 & (0x3f <<  6)) | (h5 &  0x3f       );	h2 = add(h2, temp);
				temp = (h7 & (0x3f << 19)) | (h6 & (0x7f << 12)) | (h5 & (0x3f << 6));  h3 = add(h3, temp >>>  6);
				temp = (h7 & (0x7f << 25)) | (h6 & (0x3f << 19)) | (h5 & (0x7f << 12));	h4 = add(h4, temp >>> 12);
				return int32sToBytesLE([h0, h1, h2, h3, h4]);
			case 192:
				temp = (h7 &  0x1f       ) | (h6 & (0x3f << 26)); h0 = add(h0, temp >>> 26 | temp << 6);
				temp = (h7 & (0x1f <<  5)) | (h6 &  0x1f       ); h1 = add(h1, temp);
				temp = (h7 & (0x3f << 10)) | (h6 & (0x1f <<  5)); h2 = add(h2, temp >>>  5);
				temp = (h7 & (0x1f << 16)) | (h6 & (0x3f << 10)); h3 = add(h3, temp >>> 10);
				temp = (h7 & (0x1f << 21)) | (h6 & (0x1f << 16)); h4 = add(h4, temp >>> 16);
				temp = (h7 & (0x3f << 26)) | (h6 & (0x1f << 21)); h5 = add(h5, temp >>> 21);
				return int32sToBytesLE([h0, h1, h2, h3, h4, h5]);
			case 224:
				h0 = add(h0, (h7 >>> 27) & 0x1f);
				h1 = add(h1, (h7 >>> 22) & 0x1f);
				h2 = add(h2, (h7 >>> 18) & 0x0f);
				h3 = add(h3, (h7 >>> 13) & 0x1f);
				h4 = add(h4, (h7 >>>  9) & 0x0f);
				h5 = add(h5, (h7 >>>  4) & 0x1f);
				h6 = add(h6,  h7         & 0x0f);
				return int32sToBytesLE([h0, h1, h2, h3, h4, h5, h6]);
			default:
				return int32sToBytesLE([h0, h1, h2, h3, h4, h5, h6, h7]);
		}
	}
}

export {
	HavalTransform
};