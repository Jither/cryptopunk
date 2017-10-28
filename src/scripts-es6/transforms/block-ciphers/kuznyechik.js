import { BlockCipherTransform } from "./block-cipher";

// Kuznyechik (GOST R 34.12-2015) works with 128 bit integers
// Here, for now, we use 16-byte arrays.

const ROUNDS = 10,
	KEY_SIZE = 256,
	ROUND_KEY_LENGTH = 16,
	BLOCK_LENGTH = 16;

const PI = [
	0xfc, 0xee, 0xdd, 0x11, 0xcf, 0x6e, 0x31, 0x16,	0xfb, 0xc4, 0xfa, 0xda, 0x23, 0xc5, 0x04, 0x4d,
	0xe9, 0x77, 0xf0, 0xdb, 0x93, 0x2e, 0x99, 0xba,	0x17, 0x36, 0xf1, 0xbb, 0x14, 0xcd, 0x5f, 0xc1,
	0xf9, 0x18, 0x65, 0x5a, 0xe2, 0x5c, 0xef, 0x21,	0x81, 0x1c, 0x3c, 0x42, 0x8b, 0x01, 0x8e, 0x4f,
	0x05, 0x84, 0x02, 0xae, 0xe3, 0x6a, 0x8f, 0xa0,	0x06, 0x0b, 0xed, 0x98, 0x7f, 0xd4, 0xd3, 0x1f,
	0xeb, 0x34, 0x2c, 0x51, 0xea, 0xc8, 0x48, 0xab,	0xf2, 0x2a, 0x68, 0xa2, 0xfd, 0x3a, 0xce, 0xcc,
	0xb5, 0x70, 0x0e, 0x56, 0x08, 0x0c, 0x76, 0x12,	0xbf, 0x72, 0x13, 0x47, 0x9c, 0xb7, 0x5d, 0x87,
	0x15, 0xa1, 0x96, 0x29, 0x10, 0x7b, 0x9a, 0xc7,	0xf3, 0x91, 0x78, 0x6f, 0x9d, 0x9e, 0xb2, 0xb1,
	0x32, 0x75, 0x19, 0x3d, 0xff, 0x35, 0x8a, 0x7e,	0x6d, 0x54, 0xc6, 0x80, 0xc3, 0xbd, 0x0d, 0x57,
	0xdf, 0xf5, 0x24, 0xa9, 0x3e, 0xa8, 0x43, 0xc9,	0xd7, 0x79, 0xd6, 0xf6, 0x7c, 0x22, 0xb9, 0x03,
	0xe0, 0x0f, 0xec, 0xde, 0x7a, 0x94, 0xb0, 0xbc,	0xdc, 0xe8, 0x28, 0x50, 0x4e, 0x33, 0x0a, 0x4a,
	0xa7, 0x97, 0x60, 0x73, 0x1e, 0x00, 0x62, 0x44,	0x1a, 0xb8, 0x38, 0x82, 0x64, 0x9f, 0x26, 0x41,
	0xad, 0x45, 0x46, 0x92, 0x27, 0x5e, 0x55, 0x2f,	0x8c, 0xa3, 0xa5, 0x7d, 0x69, 0xd5, 0x95, 0x3b,
	0x07, 0x58, 0xb3, 0x40, 0x86, 0xac, 0x1d, 0xf7,	0x30, 0x37, 0x6b, 0xe4, 0x88, 0xd9, 0xe7, 0x89,
	0xe1, 0x1b, 0x83, 0x49, 0x4c, 0x3f, 0xf8, 0xfe,	0x8d, 0x53, 0xaa, 0x90, 0xca, 0xd8, 0x85, 0x61,
	0x20, 0x71, 0x67, 0xa4, 0x2d, 0x2b, 0x09, 0x5b,	0xcb, 0x9b, 0x25, 0xd0, 0xbe, 0xe5, 0x6c, 0x52,
	0x59, 0xa6, 0x74, 0xd2, 0xe6, 0xf4, 0xb4, 0xc0,	0xd1, 0x66, 0xaf, 0xc2, 0x39, 0x4b, 0x63, 0xb6
];

const INV_PI = [
	0xa5, 0x2d, 0x32, 0x8f, 0x0e, 0x30, 0x38, 0xc0,	0x54, 0xe6, 0x9e, 0x39, 0x55, 0x7e, 0x52, 0x91, 
	0x64, 0x03, 0x57, 0x5a, 0x1c, 0x60, 0x07, 0x18,	0x21, 0x72, 0xa8, 0xd1, 0x29, 0xc6, 0xa4, 0x3f, 
	0xe0, 0x27, 0x8d, 0x0c, 0x82, 0xea, 0xae, 0xb4,	0x9a, 0x63, 0x49, 0xe5, 0x42, 0xe4, 0x15, 0xb7, 
	0xc8, 0x06, 0x70, 0x9d, 0x41, 0x75, 0x19, 0xc9,	0xaa, 0xfc, 0x4d, 0xbf, 0x2a, 0x73, 0x84, 0xd5, 
	0xc3, 0xaf, 0x2b, 0x86, 0xa7, 0xb1, 0xb2, 0x5b,	0x46, 0xd3, 0x9f, 0xfd, 0xd4, 0x0f, 0x9c, 0x2f, 
	0x9b, 0x43, 0xef, 0xd9, 0x79, 0xb6, 0x53, 0x7f,	0xc1, 0xf0, 0x23, 0xe7, 0x25, 0x5e, 0xb5, 0x1e, 
	0xa2, 0xdf, 0xa6, 0xfe, 0xac, 0x22, 0xf9, 0xe2,	0x4a, 0xbc, 0x35, 0xca, 0xee, 0x78, 0x05, 0x6b, 
	0x51, 0xe1, 0x59, 0xa3, 0xf2, 0x71, 0x56, 0x11,	0x6a, 0x89, 0x94, 0x65, 0x8c, 0xbb, 0x77, 0x3c, 
	0x7b, 0x28, 0xab, 0xd2, 0x31, 0xde, 0xc4, 0x5f,	0xcc, 0xcf, 0x76, 0x2c, 0xb8, 0xd8, 0x2e, 0x36, 
	0xdb, 0x69, 0xb3, 0x14, 0x95, 0xbe, 0x62, 0xa1, 0x3b, 0x16, 0x66, 0xe9, 0x5c, 0x6c, 0x6d, 0xad, 
	0x37, 0x61, 0x4b, 0xb9, 0xe3, 0xba, 0xf1, 0xa0,	0x85, 0x83, 0xda, 0x47, 0xc5, 0xb0, 0x33, 0xfa, 
	0x96, 0x6f, 0x6e, 0xc2, 0xf6, 0x50, 0xff, 0x5d,	0xa9, 0x8e, 0x17, 0x1b, 0x97, 0x7d, 0xec, 0x58, 
	0xf7, 0x1f, 0xfb, 0x7c, 0x09, 0x0d, 0x7a, 0x67,	0x45, 0x87, 0xdc, 0xe8, 0x4f, 0x1d, 0x4e, 0x04, 
	0xeb, 0xf8, 0xf3, 0x3e, 0x3d, 0xbd, 0x8a, 0x88,	0xdd, 0xcd, 0x0b, 0x13, 0x98, 0x02, 0x93, 0x80, 
	0x90, 0xd0, 0x24, 0x34, 0xcb, 0xed, 0xf4, 0xce,	0x99, 0x10, 0x44, 0x40, 0x92, 0x3a, 0x01, 0x26, 
	0x12, 0x1a, 0x48, 0x68, 0xf5, 0x81, 0x8b, 0xc7,	0xd6, 0x20, 0x0a, 0x08, 0x00, 0x4c, 0xd7, 0x74		
];

const L_FACTORS = [
	0x94, 0x20, 0x85, 0x10, 0xc2, 0xc0, 0x01, 0xfb,
	0x01, 0xc0, 0xc2, 0x10, 0x85, 0x20, 0x94, 0x01
];

const GF_MUL = [];

function computeGF(a, b)
{
	let result = 0;
	while (b !== 0)
	{
		if ((b & 1) !== 0)
		{
			result ^= a;
		}
		const hiBit = a & 0x80;
		a <<= 1;
		if (hiBit)
		{
			a ^= 0xc3; // Polynomial: x^8 + x^7 + x^6 + x + 1
		}
		b >>>= 1;
	}
	return result;
}

function precompute()
{
	if (GF_MUL.length > 0)
	{
		// Already calculated
		return;
	}

	for (let a = 0; a < 256; a++)
	{
		const table = new Uint8Array(256);
		GF_MUL.push(table);
		for (let b = 0; b < 256; b++)
		{
			table[b] = computeGF(a, b);
		}
	}
}

function LSX(a, k)
{
	xor(a, k);
	S(a);
	L(a);
}

function invLSX(a, k)
{
	invL(a);
	invS(a);
	xor(a, k);
}

function C(c, i)
{
	c.fill(0);
	c[15] = i;
	L(c);
}

function L(data)
{
	for (let r = 0; r < ROUND_KEY_LENGTH; r++)
	{
		let z = data[15];
		for (let i = 14; i >= 0; i--)
		{
			data[i + 1] = data[i];
			z ^= GF_MUL[data[i]][L_FACTORS[i]];
		}
	
		data[0] = z;
	}
}

function invL(data)
{
	for (let r = 0; r < ROUND_KEY_LENGTH; r++)
	{
		let z = data[0];
		for (let i = 0; i < 15; i++)
		{
			data[i] = data[i + 1];
			z ^= GF_MUL[data[i]][L_FACTORS[i]];
		}
	
		data[15] = z;
	}
}

function S(data)
{
	for (let i = 0; i < data.length; i++)
	{
		data[i] = PI[data[i]];
	}
}

function invS(data)
{
	for (let i = 0; i < data.length; i++)
	{
		data[i] = INV_PI[data[i]];
	}
}

function xor(a, b)
{
	for (let i = 0; i < a.length; i++)
	{
		a[i] ^= b[i];
	}
}

class KuznyechikBaseTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, KEY_SIZE);
		
		precompute();

		const roundKeys = this.prepareRoundKeys(keyBytes);

		return this.transformBlocks(bytes, BLOCK_LENGTH * 8, roundKeys);
	}

	prepareRoundKeys(keyBytes)
	{
		const roundKeys = [];

		for (let i = 0; i < ROUNDS; i++)
		{
			roundKeys.push(new Uint8Array(ROUND_KEY_LENGTH));
		}

		let x = new Uint8Array(ROUND_KEY_LENGTH),
			y = new Uint8Array(ROUND_KEY_LENGTH);
		const
			c = new Uint8Array(ROUND_KEY_LENGTH),
			temp = new Uint8Array(ROUND_KEY_LENGTH);
		
		for (let i = 0; i < ROUND_KEY_LENGTH; i++)
		{
			roundKeys[0][i] = x[i] = keyBytes[i];
			roundKeys[1][i] = y[i] = keyBytes[i + 16];
		}

		for (let i = 1; i < ROUNDS / 2; i++)
		{
			for (let j = 1; j <= 8; j++)
			{
				C(c, 8 * (i - 1) + j);
				temp.set(x);
				LSX(temp, c);
				xor(y, temp);
				[y, x] = [x, y];
			}
			roundKeys[i * 2].set(x);
			roundKeys[i * 2 + 1].set(y);
		}

		return roundKeys;
	}
}

class KuznyechikEncryptTransform extends KuznyechikBaseTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, roundKeys)
	{
		const state = new Uint8Array(block);
		//const temp = new Uint8Array(block.length);

		for (let i = 0; i < ROUNDS - 1; i++)
		{
			LSX(state, roundKeys[i]);
		}

		xor(state, roundKeys[ROUNDS - 1]);

		dest.set(state, destOffset);
	}
}

class KuznyechikDecryptTransform extends KuznyechikBaseTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, roundKeys)
	{
		const state = new Uint8Array(block);

		xor(state, roundKeys[ROUNDS - 1]);
		
		for (let i = ROUNDS - 2; i >= 0; i--)
		{
			invLSX(state, roundKeys[i]);
		}

		dest.set(state, destOffset);
	}
}

export {
	KuznyechikEncryptTransform,
	KuznyechikDecryptTransform
};