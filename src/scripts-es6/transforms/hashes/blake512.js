import { Transform } from "../transforms";
import { int64sToBytesBE, bytesToInt64sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { add64, ror64, xor64 } from "../../cryptopunk.bitarith";

const u512 = [
	{ hi: 0x243f6a88, lo: 0x85a308d3 },
	{ hi: 0x13198a2e, lo: 0x03707344 },
	{ hi: 0xa4093822, lo: 0x299f31d0 },
	{ hi: 0x082efa98, lo: 0xec4e6c89 },
	{ hi: 0x452821e6, lo: 0x38d01377 },
	{ hi: 0xbe5466cf, lo: 0x34e90c6c },
	{ hi: 0xc0ac29b7, lo: 0xc97c50dd },
	{ hi: 0x3f84d5b5, lo: 0xb5470917 },
	{ hi: 0x9216d5d9, lo: 0x8979fb1b },
	{ hi: 0xd1310ba6, lo: 0x98dfb5ac },
	{ hi: 0x2ffd72db, lo: 0xd01adfb7 },
	{ hi: 0xb8e1afed, lo: 0x6a267e96 },
	{ hi: 0xba7c9045, lo: 0xf12c7f99 },
	{ hi: 0x24a19947, lo: 0xb3916cf7 },
	{ hi: 0x0801f2e2, lo: 0x858efc16 },
	{ hi: 0x636920d8, lo: 0x71574e69 }
];

const SIGMA = [
  [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15 ],
  [14, 10,  4,  8,  9, 15, 13,  6,  1, 12,  0,  2, 11,  7,  5,  3 ],
  [11,  8, 12,  0,  5,  2, 15, 13, 10, 14,  3,  6,  7,  1,  9,  4 ],
  [ 7,  9,  3,  1, 13, 12, 11, 14,  2,  6,  5, 10,  4,  0, 15,  8 ],
  [ 9,  0,  5,  7,  2,  4, 10, 15, 14,  1, 11, 12,  6,  8,  3, 13 ],
  [ 2, 12,  6, 10,  0, 11,  8,  3,  4, 13,  7,  5, 15, 14,  1,  9 ],
  [12,  5,  1, 15, 14, 13,  4, 10,  0,  7,  6,  3,  9,  2,  8, 11 ],
  [13, 11,  7, 14, 12,  1,  3,  9,  5,  0, 15,  4,  8,  6,  2, 10 ],
  [ 6, 15, 14,  9, 11,  3,  0,  8, 12,  2, 13,  7,  1,  4, 10,  5 ],
  [10,  2,  8,  4,  7,  6,  1,  5, 15, 11,  9, 14,  3, 12, 13,  0 ],
  [ 0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15 ],
  [14, 10,  4,  8,  9, 15, 13,  6,  1, 12,  0,  2, 11,  7,  5,  3 ],
  [11,  8, 12,  0,  5,  2, 15, 13, 10, 14,  3,  6,  7,  1,  9,  4 ],
  [ 7,  9,  3,  1, 13, 12, 11, 14,  2,  6,  5, 10,  4,  0, 15,  8 ],
  [ 9,  0,  5,  7,  2,  4, 10, 15, 14,  1, 11, 12,  6,  8,  3, 13 ],
  [ 2, 12,  6, 10,  0, 11,  8,  3,  4, 13,  7,  5, 15, 14,  1,  9 ]
];

function g(m, v, i, a, b, c, d, e)
{
	const sigmaE = SIGMA[i][e];
	const sigmaE1 = SIGMA[i][e + 1];
	v[a] = add64(v[a], xor64(m[sigmaE], u512[sigmaE1]), v[b]);
	v[d] = ror64(xor64(v[d], v[a]), 32);
	v[c] = add64(v[c], v[d]);
	v[b] = ror64(xor64(v[b], v[c]), 25);
	v[a] = add64(v[a], xor64(m[sigmaE1], u512[sigmaE]), v[b]);
	v[d] = ror64(xor64(v[d], v[a]), 16);
	v[c] = add64(v[c], v[d]);
	v[b] = ror64(xor64(v[b], v[c]), 11);
}

class Blake512Transform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Hash");		
	}

	padMessage(bytes)
	{
		const length = bytes.length;
		
		// BLAKE spec says 895 % 1024 - but that's excluding the end-of-padding bit, so for bytes we can
		// do the usual 896 % 1024
		let paddingLength = 112 - length % 128;
		if (paddingLength <= 0)
		{
			paddingLength += 128;
		}
		const padded = new Uint8Array(length + paddingLength + 16);
		padded.set(bytes);
		padded[length] = 0x80;

		const index = length + paddingLength; // Go to last 16 bytes of padding
		if (!this.isBlake384)
		{
			padded[index - 1] |= 0x01; // May be the same byte as the start-of-padding bit
		}

		// We'll never reach 2^^64 bit length in Javascript
		const bitLengthLo = length << 3;
		const bitLengthHi = length >>> 29;

		padded.set(int32sToBytesBE([bitLengthHi, bitLengthLo]), index + 8);

		return padded;
	}

	getIV()
	{
		return [
			{ hi: 0x6a09e667, lo: 0xf3bcc908 },
			{ hi: 0xbb67ae85, lo: 0x84caa73b },
			{ hi: 0x3c6ef372, lo: 0xfe94f82b }, 
			{ hi: 0xa54ff53a, lo: 0x5f1d36f1 }, 
			{ hi: 0x510e527f, lo: 0xade682d1 }, 
			{ hi: 0x9b05688c, lo: 0x2b3e6c1f }, 
			{ hi: 0x1f83d9ab, lo: 0xfb41bd6b }, 
			{ hi: 0x5be0cd19, lo: 0x137e2179 }
		];
	}

	fill(arr)
	{
		for (let i = 0; i < arr.length; i++)
		{
			arr[i] = { hi: 0, lo: 0 };
		}
	}

	transform(bytes)
	{
		const padded = this.padMessage(bytes);

		const h = this.getIV();

		const s = new Array(4);
		const t = new Array(2);
		const v = new Array(16);
		this.fill(s);
		this.fill(t);
		this.fill(v);

		const messageBits = bytes.length * 8;

		let bitCounter = 0;
		for (let blockIndex = 0; blockIndex < padded.length; blockIndex += 128)
		{
			bitCounter += 1024;
			if (bitCounter > messageBits + 1024)
			{
				bitCounter = 0;
			}
			else if (bitCounter > messageBits)
			{
				bitCounter = messageBits;
			}

			t[0].lo = bitCounter & 0xffffffff;
			t[0].hi = (bitCounter / 0x100000000) | 0;
			// A Javascript implementation will never reach above 2^^64 bit input
			// t[1] = (bitCounter / 0x100000000) | 0;

			const block = padded.subarray(blockIndex, blockIndex + 128);
			this.transformBlock(block, h, t, v, s);
		}
		if (this.isBlake384)
		{
			// Truncate last 32 bits/4 bytes
			h.pop();
		}
		return int64sToBytesBE(h);
	}

	transformBlock(block, h, t, v, s)
	{
		const m = bytesToInt64sBE(block);
		for (let i = 0; i < 8; i++)
		{
			v[i].hi = h[i].hi;
			v[i].lo = h[i].lo;
		}
		v[ 8] = xor64(s[0], u512[0]);
		v[ 9] = xor64(s[1], u512[1]);
		v[10] = xor64(s[2], u512[2]);
		v[11] = xor64(s[3], u512[3]);
		v[12].hi = u512[4].hi;  v[12].lo = u512[4].lo;
		v[13].hi = u512[5].hi;  v[13].lo = u512[5].lo;
		v[14].hi = u512[6].hi;  v[14].lo = u512[6].lo;
		v[15].hi = u512[7].hi;  v[15].lo = u512[7].lo;

		v[12] = xor64(v[12], t[0]);
		v[13] = xor64(v[13], t[0]);
		v[14] = xor64(v[14], t[1]);
		v[15] = xor64(v[15], t[1]);

		for(let i = 0; i < 16; i++)
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
			h[i % 8] = xor64(h[i % 8], v[i]);
		}
		for (let i = 0; i < 8; i++)
		{
			h[i] = xor64(h[i], s[i % 4]);
		}
	}
}

class Blake384Transform extends Blake512Transform
{
	constructor()
	{
		super();
		this.isBlake384 = true;
	}

	getIV()
	{
		return [
			{ hi: 0xcbbb9d5d, lo: 0xc1059ed8 },
			{ hi: 0x629a292a, lo: 0x367cd507 },
			{ hi: 0x9159015a, lo: 0x3070dd17 },
			{ hi: 0x152fecd8, lo: 0xf70e5939 },
			{ hi: 0x67332667, lo: 0xffc00b31 },
			{ hi: 0x8eb44a87, lo: 0x68581511 },
			{ hi: 0xdb0c2e0d, lo: 0x64f98fa7 },
			{ hi: 0x47b5481d, lo: 0xbefa4fa4 }
		];
	}
}

export {
	Blake384Transform,
	Blake512Transform
};