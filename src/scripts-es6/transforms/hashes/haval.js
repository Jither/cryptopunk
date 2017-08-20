import { MdHashTransform } from "./hash";
import { int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";
import { add, ror } from "../../cryptopunk.bitarith";

const HAVAL_VERSION = 1;

const PASSES_NAMES  = [3, 4, 5];
const SIZE_NAMES  = [128, 160, 192, 224, 256];

// Round constants for each pass
// Starting from pass 2, each of these are 1024 bits of the fractional part of PI, starting from bit 256
// (the first 256 bits are used for the initial state, see below)
const ROUND_CONSTANTS = [
	[
		0, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0,
		0, 0, 0, 0, 0, 0, 0, 0
	],
	[
		0x452821e6, 0x38d01377, 0xbe5466cf, 0x34e90c6c, 0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5, 0xb5470917, 
		0x9216d5d9, 0x8979fb1b, 0xd1310ba6, 0x98dfb5ac, 0x2ffd72db, 0xd01adfb7, 0xb8e1afed, 0x6a267e96, 
		0xba7c9045, 0xf12c7f99, 0x24a19947, 0xb3916cf7, 0x0801f2e2, 0x858efc16, 0x636920d8, 0x71574e69, 
		0xa458fea3, 0xf4933d7e, 0x0d95748f, 0x728eb658, 0x718bcd58, 0x82154aee, 0x7b54a41d, 0xc25a59b5
	],
	[
		0x9c30d539, 0x2af26013, 0xc5d1b023, 0x286085f0, 0xca417918, 0xb8db38ef, 0x8e79dcb0, 0x603a180e, 
		0x6c9e0e8b, 0xb01e8a3e, 0xd71577c1, 0xbd314b27, 0x78af2fda, 0x55605c60, 0xe65525f3, 0xaa55ab94, 
		0x57489862, 0x63e81440, 0x55ca396a, 0x2aab10b6, 0xb4cc5c34, 0x1141e8ce, 0xa15486af, 0x7c72e993, 
		0xb3ee1411, 0x636fbc2a, 0x2ba9c55d, 0x741831f6, 0xce5c3e16, 0x9b87931e, 0xafd6ba33, 0x6c24cf5c
	],
	[
		0x7a325381, 0x28958677, 0x3b8f4898, 0x6b4bb9af, 0xc4bfe81b, 0x66282193, 0x61d809cc, 0xfb21a991, 
		0x487cac60, 0x5dec8032, 0xef845d5d, 0xe98575b1, 0xdc262302, 0xeb651b88, 0x23893e81, 0xd396acc5, 
		0x0f6d6ff3, 0x83f44239, 0x2e0b4482, 0xa4842004, 0x69c8f04a, 0x9e1f9b5e, 0x21c66842, 0xf6e96c9a, 
		0x670c9c61, 0xabd388f0, 0x6a51a0d2, 0xd8542f68, 0x960fa728, 0xab5133a3, 0x6eef0b6c, 0x137a3be4
	],
	[
		0xba3bf050, 0x7efb2a98, 0xa1f1651d, 0x39af0176, 0x66ca593e, 0x82430e88, 0x8cee8619, 0x456f9fb4, 
		0x7d84a5c3, 0x3b8b5ebe, 0xe06f75d8, 0x85c12073, 0x401a449f, 0x56c16aa6, 0x4ed3aa62, 0x363f7706, 
		0x1bfedf72, 0x429b023d, 0x37d0d724, 0xd00a1248, 0xdb0fead3, 0x49f1c09b, 0x075372c9, 0x80991b7b, 
		0x25d479d8, 0xf6e8def7, 0xe3fe501a, 0xb6794c3b, 0x976ce0bd, 0x04c006ba, 0xc1a94fb6, 0x409f60c4
	]
];

// Word processing orders for each pass
const ROUND_ORDERS = [
	[
		0, 1, 2, 3, 4, 5, 6, 7,
		8, 9, 10, 11, 12, 13, 14, 15,
		16, 17, 18, 19, 20, 21, 22, 23,
		24, 25, 26, 27, 28, 29, 30, 31
	],
	[
		5, 14, 26, 18, 11, 28, 7, 16,
		0, 23, 20, 22, 1, 10, 4, 8,
		30, 3, 21, 9, 17, 24, 29, 6,
		19, 12, 15, 13, 2, 25, 31, 27
	],
	[
		19, 9, 4, 20, 28, 17, 8, 22, 
		29, 14, 25, 12, 24, 30, 16, 26, 
		31, 15, 7, 3, 1, 0, 18, 27, 
		13, 6, 21, 10, 23, 11, 5, 2
	],
	[
		24, 4, 0, 14, 2, 7, 28, 23,
		26, 6, 30, 20, 18, 25, 19, 3,
		22, 11, 31, 21, 8, 27, 12, 9,
		1, 29, 5, 15, 17, 10, 16, 13
	],
	[
		27, 3, 21, 26, 17, 11, 20, 29, 
		19, 0, 12, 7, 13, 8, 31, 10, 
		5, 9, 14, 30, 18, 6, 28, 24,
		2, 23, 16, 22, 4, 1, 25, 15
	]
];

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

// These functions to permutation of the state before passing it on to
// the 
// camelcase is not very readable for these function names:
/* eslint-disable camelcase */
function ff1_3(x)
{
	return f1(x[1], x[0], x[3], x[5], x[6], x[2], x[4]);
}

function ff1_4(x)
{
	return f1(x[2], x[6], x[1], x[4], x[5], x[3], x[0]);
}

function ff1_5(x)
{
	return f1(x[3], x[4], x[1], x[0], x[5], x[2], x[6]);
}

function ff2_3(x)
{
	return f2(x[4], x[2], x[1], x[0], x[5], x[3], x[6]);
}

function ff2_4(x)
{
	return f2(x[3], x[5], x[2], x[0], x[1], x[6], x[4]);
}

function ff2_5(x)
{
	return f2(x[6], x[2], x[1], x[0], x[3], x[4], x[5]);
}

function ff3_3(x)
{
	return f3(x[6], x[1], x[2], x[3], x[4], x[5], x[0]);
}

function ff3_4(x)
{
	return f3(x[1], x[4], x[3], x[6], x[0], x[2], x[5]);
}

function ff3_5(x)
{
	return f3(x[2], x[6], x[0], x[4], x[3], x[1], x[5]);
}

function ff4_4(x)
{
	return f4(x[6], x[4], x[0], x[5], x[2], x[1], x[3]);
}

function ff4_5(x)
{
	return f4(x[1], x[5], x[3], x[2], x[0], x[4], x[6]);
}

function ff5_5(x)
{
	return f5(x[2], x[5], x[0], x[6], x[4], x[3], x[1]);
}
/* eslint-enable camelcase */

class HavalTransform extends MdHashTransform
{
	constructor()
	{
		super(1024, "LE", 10);
		this.paddingStartBit = 0x01;

		this.addOption("passes", "Passes", 5, { type: "select", texts: PASSES_NAMES })
			.addOption("size", "Size", 128, { type: "select", texts: SIZE_NAMES });
	}

	writeSuffix(block, offset, messageLength)
	{
		// Difference from standard Merkle:
		// Version number, round count, hash length (last 3 bits) and bit length of message
		// are stored in the last 10 bytes after the padding:
		const info = HAVAL_VERSION | (this.options.passes << 3) | (this.options.size << 6);
		block[offset++] = info & 0xff;
		block[offset++] = info >>> 8;

		super.writeSuffix(block, offset, messageLength);
	}

	transform(bytes)
	{
		// Initial state: first 256 bits of PI:
		const state = [
			0x243f6a88,
			0x85a308d3,
			0x13198a2e,
			0x03707344,
			0xa4093822,
			0x299f31d0,
			0x082efa98,
			0xec4e6c89
		];

		const context = { state };
		const ff = context.ff = [];

		/* eslint-disable camelcase */
		switch (this.options.passes)
		{
			case 3:
				ff[0] = ff1_3;
				ff[1] = ff2_3;
				ff[2] = ff3_3;
				break;
			case 4:
				ff[0] = ff1_4;
				ff[1] = ff2_4;
				ff[2] = ff3_4;
				ff[3] = ff4_4;
				break;
			default:
				ff[0] = ff1_5;
				ff[1] = ff2_5;
				ff[2] = ff3_5;
				ff[3] = ff4_5;
				ff[4] = ff5_5;
				break;
		}
		/* eslint-enable camelcase */

		this.transformBlocks(bytes, context);

		return this.tailor(context.state, this.options.size);
	}

	transformBlock(block, context)
	{
		const b = bytesToInt32sLE(block);
		const state = context.state;

		const x = state.concat();

		for (let pass = 0; pass < this.options.passes; pass++)
		{
			const
				ff = context.ff[pass],
				orders = ROUND_ORDERS[pass],
				rcon = ROUND_CONSTANTS[pass];

			for (let round = 0; round < 32; round++)
			{
				const t = ff(x);
				// Shift state 1 word left:
				const x7 = x[7];
				x[7] = x[6];
				x[6] = x[5];
				x[5] = x[4];
				x[4] = x[3];
				x[3] = x[2];
				x[2] = x[1];
				x[1] = x[0];
				x[0] = add(ror(t, 7), ror(x7, 11), b[orders[round]], rcon[round]);
			}
		}

		state[0] = add(state[0], x[0]);
		state[1] = add(state[1], x[1]);
		state[2] = add(state[2], x[2]);
		state[3] = add(state[3], x[3]);
		state[4] = add(state[4], x[4]);
		state[5] = add(state[5], x[5]);
		state[6] = add(state[6], x[6]);
		state[7] = add(state[7], x[7]);
	}

	tailor(state, size)
	{
		let temp;
		let [h0, h1, h2, h3, h4, h5, h6, h7] = state; // eslint-disable-line prefer-const
		switch (size)
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