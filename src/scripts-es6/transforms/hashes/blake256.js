import { MdHashTransform } from "./hash";
import { ROOTS } from "../shared/constants";
import { int32sToBytesBE, bytesToInt32sBE } from "../../cryptopunk.utils";
import { add, ror } from "../../cryptopunk.bitarith";
import { SIGMA } from "./blake_shared";

const u256 = [
	0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344,
	0xa4093822, 0x299f31d0, 0x082efa98, 0xec4e6c89,
	0x452821e6, 0x38d01377, 0xbe5466cf, 0x34e90c6c,
	0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5, 0xb5470917
];

function g(m, v, i, a, b, c, d, e)
{
	const sigmaE = SIGMA[i][e];
	const sigmaE1 = SIGMA[i][e + 1];
	v[a] = add(v[a], m[sigmaE] ^ u256[sigmaE1], v[b]);
	v[d] = ror(v[d] ^ v[a], 16);
	v[c] = add(v[c], v[d]);
	v[b] = ror(v[b] ^ v[c], 12);
	v[a] = add(v[a], m[sigmaE1] ^ u256[sigmaE], v[b]);
	v[d] = ror(v[d] ^ v[a], 8);
	v[c] = add(v[c], v[d]);
	v[b] = ror(v[b] ^ v[c], 7);
}

class Blake256Transform extends MdHashTransform
{
	constructor()
	{
		super(512, "BE");
		this.paddingEndBit = 0x01;
	}

	getIV()
	{
		// Same constants as SHA-256
		return [
			ROOTS.SQRT2, 
			ROOTS.SQRT3, 
			ROOTS.SQRT5, 
			ROOTS.SQRT7, 
			ROOTS.SQRT11, 
			ROOTS.SQRT13, 
			ROOTS.SQRT17, 
			ROOTS.SQRT19
		];
	}

	transform(bytes)
	{
		const context = {
			h: this.getIV(),
			s: [0, 0, 0, 0],
			v: new Array(16),
			bitCounter: 0,
			messageSize: bytes.length * 8
		};

		this.transformBlocks(bytes, context);

		if (this.isBlake224)
		{
			// Truncate last 32 bits/4 bytes
			context.h.pop();
		}
		return int32sToBytesBE(context.h);
	}

	countBits(context)
	{
		let bitCounter = context.bitCounter;
		const messageSize = context.messageSize;
		bitCounter += 512;
		if (bitCounter > messageSize + 512)
		{
			// No message bits in this block - it's pure padding
			bitCounter = 0;
		}
		else if (bitCounter > messageSize)
		{
			// Last block - don't include the padding in the counter
			bitCounter = messageSize;
		}
		context.bitCounter = bitCounter;

		return [bitCounter & 0xffffffff, (bitCounter / 0x100000000) | 0];
	}

	transformBlock(block, context)
	{
		const
			h = context.h,
			s = context.s,
			v = context.v,
			t = this.countBits(context),
			m = bytesToInt32sBE(block);

		for (let i = 0; i < 8; i++)
		{
			v[i] = h[i];
		}

		v[ 8] = s[0] ^ u256[0];
		v[ 9] = s[1] ^ u256[1];
		v[10] = s[2] ^ u256[2];
		v[11] = s[3] ^ u256[3];
		v[12] = u256[4];
		v[13] = u256[5];
		v[14] = u256[6];
		v[15] = u256[7];

		v[12] ^= t[0];
		v[13] ^= t[0];
		v[14] ^= t[1];
		v[15] ^= t[1];

		for(let i = 0; i < 14; i++) // TODO: Maybe implement BLAKE-28/32 - should just be round count 10 instead of 14
		{
			// column step
			g(m, v, i, 0,  4,  8, 12,  0 );
			g(m, v, i, 1,  5,  9, 13,  2 );
			g(m, v, i, 2,  6, 10, 14,  4 );
			g(m, v, i, 3,  7, 11, 15,  6 );
			// diagonal step
			g(m, v, i, 0,  5, 10, 15,  8 );
			g(m, v, i, 1,  6, 11, 12, 10 );
			g(m, v, i, 2,  7,  8, 13, 12 );
			g(m, v, i, 3,  4,  9, 14, 14 );
		}

		for (let i = 0; i < 16; i++)
		{
			h[i % 8] ^= v[i];
		}
		for (let i = 0; i < 8; i++)
		{
			h[i] ^= s[i % 4];
		}
	}
}

class Blake224Transform extends Blake256Transform
{
	constructor()
	{
		super();
		this.isBlake224 = true;
		this.paddingEndBit = null;
	}

	getIV()
	{
		// Same constants as SHA-224
		return [
			ROOTS.SQRT23,
			ROOTS.SQRT29,
			ROOTS.SQRT31,
			ROOTS.SQRT37,
			ROOTS.SQRT41,
			ROOTS.SQRT43,
			ROOTS.SQRT47,
			ROOTS.SQRT53
		];
	}
}

export {
	Blake224Transform,
	Blake256Transform
};