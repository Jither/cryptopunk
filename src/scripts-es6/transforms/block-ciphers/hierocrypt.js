import { BlockCipherTransform } from "./block-cipher";
import { gfExp256, gfMulTable } from "../../cryptopunk.galois";
import { bytesToHex } from "../../cryptopunk.utils";
import { permutateBits, xorBytes } from "../../cryptopunk.bitarith";
import { ROOTS } from "../shared/constants";

let SBOX, ISBOX;

const ROUNDS = 6;
const HIEROCRYPT_POLYNOMIAL = 0x163;

const H = [
	ROOTS.SQRT2_DIV4,
	ROOTS.SQRT3_DIV4,
	ROOTS.SQRT5_DIV4,
	ROOTS.SQRT10_DIV4,
	ROOTS.SQRT15_DIV4
];

let G;

/*
const MDS = [
	0xc4, 0x65, 0xc8, 0x8b,
	0x8b, 0xc4, 0x65, 0xc8,
	0xc8, 0x8b, 0xc4, 0x65,
	0x65, 0xc8, 0x8b, 0xc4
];

const MDS_INV = [
	0x82, 0xc4, 0x34, 0xf6,
	0xf6, 0x82, 0xc4, 0x34,
	0x34, 0xf6, 0x82, 0xc4,
	0xc4, 0x34, 0xf6, 0x82
];
*/

// Hierocrypt-L1

const MDSH1 = [
	[0x5, 0x7],
	[0xa, 0xb]
];

const MDSH1_INV = [
	[0xc, 0xa],
	[0x5, 0xb]
];

// Hierocrypt-3
/*
const G_INDEX = [3, 0, 2, 1, 1, 3, 0, 2, 2, 3, 1, 0];

const K = [
	[0, 1, 2, 3, 3, 2, 1, -1, -1, -1],
	[1, 0, 3, 2, 2, 3, 0, 1, -1, -1],
	[4, 0, 2, 1, 3, 3, 1, 2, 0, -1]
];

const MDSH3 = [
	0x5, 0x5, 0xa, 0xe,
	0xe, 0x5, 0x5, 0xa,
	0xa, 0xe, 0x5, 0x5,
	0x5, 0xa, 0xe, 0x5
];

const MDSH3_INV = [
	0xb, 0xe, 0xe, 0x6,
	0x6, 0xb, 0xe, 0xe,
	0xe, 0x6, 0xb, 0xe,
	0xe, 0xe, 0x6, 0xb
];

*/

let MULc4, MUL65, MULc8, MUL8b;
let MUL82, MUL34, MULf6;

function print(header, ...rest)
{
	let x = "";
	for (let i = 0; i < rest.length; i++)
	{
		x += bytesToHex(rest[i]) + " ";
	}

	console.log(header + ":", x);
}

function precompute()
{
	if (SBOX)
	{
		return;
	}

	SBOX = new Uint8Array(256);
	ISBOX = new Uint8Array(256);

	MULc4 = gfMulTable(0xc4, HIEROCRYPT_POLYNOMIAL);
	MUL65 = gfMulTable(0x65, HIEROCRYPT_POLYNOMIAL);
	MULc8 = gfMulTable(0xc8, HIEROCRYPT_POLYNOMIAL);
	MUL8b = gfMulTable(0x8b, HIEROCRYPT_POLYNOMIAL);
	MUL82 = gfMulTable(0x82, HIEROCRYPT_POLYNOMIAL);
	MUL34 = gfMulTable(0x34, HIEROCRYPT_POLYNOMIAL);
	MULf6 = gfMulTable(0xf6, HIEROCRYPT_POLYNOMIAL);

	for (let i = 0; i < 256; i++)
	{
		// Permutate bits - from Hierocrypt spec:
		// i    1 2 3 4 5 6 7 8
		// π[i] 3 7 5 8 6 2 4 1
		// Note that bits are counted left to right (1-8), and π[i] indicates the source bit position.
		// This means that we need to subtract each value from 8 for our 7-0 order:
		let x = permutateBits(i, [5, 1, 3, 0, 2, 6, 4, 7]);

		// x ^ 247 + {07} in GF(2^8):
		x = gfExp256(x, 247, HIEROCRYPT_POLYNOMIAL) ^ 0x07;

		SBOX[i] = x;
		ISBOX[x] = i;
	}

	G = new Array(H.length);
	for (let gIndex = 0; gIndex < H.length; gIndex++)
	{
		const g = G[gIndex] = new Uint8Array(4);
		for (let i = 0; i < 4; i++)
		{
			g[i] = (H[gIndex] >>> ((3 - i) * 8)) & 0xff;
		}
	}
}

function mdsL(x)
{
	const x0 = x[0],
		x1 = x[1],
		x2 = x[2],
		x3 = x[3];

	// Multiply MDS by x over GF(2^8)
	x[0] = MULc4[x0] ^ MUL65[x1] ^ MULc8[x2] ^ MUL8b[x3];
	x[1] = MUL8b[x0] ^ MULc4[x1] ^ MUL65[x2] ^ MULc8[x3];
	x[2] = MULc8[x0] ^ MUL8b[x1] ^ MULc4[x2] ^ MUL65[x3];
	x[3] = MUL65[x0] ^ MULc8[x1] ^ MUL8b[x2] ^ MULc4[x3];
}

function mdsLinv(x)
{
	const x0 = x[0],
		x1 = x[1],
		x2 = x[2],
		x3 = x[3];

	// Multiply MDS by x over GF(2^8)
	x[0] = MUL82[x0] ^ MULc4[x1] ^ MUL34[x2] ^ MULf6[x3];
	x[1] = MULf6[x0] ^ MUL82[x1] ^ MULc4[x2] ^ MUL34[x3];
	x[2] = MUL34[x0] ^ MULf6[x1] ^ MUL82[x2] ^ MULc4[x3];
	x[3] = MULc4[x0] ^ MUL34[x1] ^ MULf6[x2] ^ MUL82[x3];
}

function MDSL(x64)
{
	mdsL(x64.subarray(0, 4));
	mdsL(x64.subarray(4, 8));
}

function MDSLinv(x64)
{
	mdsLinv(x64.subarray(0, 4));
	mdsLinv(x64.subarray(4, 8));
}

function mdshMul(a, x)
{
	const [a0, a1, a2, a3] = a;
	let r0 = 0, r1 = 0, r2 = 0, r3 = 0;

	if (x & 1)
	{
		r0 ^= a0; r1 ^= a1; r2 ^= a2; r3 ^= a3;
	}
	if (x & 2)
	{
		r0 ^= a1; r1 ^= a2; r3 ^= a0;
		r2 ^= a3 ^ a0;
	}
	if (x & 4)
	{
		r0 ^= a2; r3 ^= a1;
		r1 ^= a3 ^ a0;
		r2 ^= a0 ^ a1;
	}
	if (x & 8)
	{
		r3 ^= a2;
		r0 ^= a0 ^ a3;
		r1 ^= a1 ^ a0;
		r2 ^= a2 ^ a1;
	}
	a[0] = r0; a[1] = r1; a[2] = r2; a[3] = r3;
}

function MDSH(x64, mdsh)
{
	const temp = new Uint8Array(4);
	const out = new Uint8Array(8);
	for (let i = 0; i < 2; i++)
	{
		for (let j = 0; j < 2; j++)
		{
			for (let k = 0; k < 4; k++)
			{
				temp[k] = x64[j * 4 + k];
			}
			mdshMul(temp, mdsh[i][j]);
			for (let k = 0; k < 4; k++)
			{
				out[i * 4 + k] ^= temp[k];
			}
		}
	}
	x64.set(out);
}

function S(x, sbox)
{
	for (let i = 0; i < 8; i++)
	{
		x[i] = sbox[x[i]];
	}
}

function XS(x, k)
{
	xorBytes(x, k.subarray(0, 8));
	S(x, SBOX);
	MDSL(x);
	xorBytes(x, k.subarray(8, 16));
	S(x, SBOX);
}

function IXS(x, k)
{
	xorBytes(x, k.subarray(0, 8));
	S(x, ISBOX);
	MDSLinv(x);
	xorBytes(x, k.subarray(8, 16));
	S(x, ISBOX);
}

function P8(x)
{
	x[0] ^= x[2];
	x[1] ^= x[3];
	x[2] ^= x[1];
	x[3] ^= x[0];
}

// x0x1 x2x3 y0y1 y2y3
//  |    |    |    |
//  X----+----o    |
//  |    |    |    |
//  |    X----+----o
//  |    |    |    |
//  |    o----X    |
//  |    |    |    |
//  o----+----+----X
//  |    |    |    |
// x0x1 x2x3 y0y1 y2y3
function P16(x, y)
{
	x[0] ^= y[0];
	x[1] ^= y[1];
	x[2] ^= y[2];
	x[3] ^= y[3];
	y[0] ^= x[2];
	y[1] ^= x[3];
	y[2] ^= x[0];
	y[3] ^= x[1];
}

// x0x1 x2x3 y0y1 y2y3
//  |    |    |    |
//  o----+----+----X
//  |    |    |    |
//  |    o----X    |
//  |    |    |    |
//  |    X----+----o
//  |    |    |    |
//  X----+----o    |
//  |    |    |    |
// x0x1 x2x3 y0y1 y2y3
function P16inv(x, y)
{
	y[2] ^= x[0];
	y[3] ^= x[1];
	y[0] ^= x[2];
	y[1] ^= x[3];
	x[2] ^= y[2];
	x[3] ^= y[3];
	x[0] ^= y[0];
	x[1] ^= y[1];
}

function F(x)
{
	S(x, SBOX);
	P8(x);
}

function sigma(z, g)
{
	// Z3 = M5(Z3[-1]) ^ G
	mdshMul(z[2], 0x5);
	xorBytes(z[2], g);
	// Z4 = Mb(Z4[-1])
	mdshMul(z[3], 0xb);
	// Z1 = Z2[-1];
	const z0 = Uint8Array.from(z[0]);
	z[0].set(z[1]);
	// Z2 = Z1[-1] ^ Fσ(Z2[-1] ^ Z3)
	xorBytes(z[1], z[2]);
	F(z[1]);
	xorBytes(z[1], z0);
}

function sigmaInv(z, g)
{
	// Z2 = Z1[-1]
	const z1 = Uint8Array.from(z[0]);
	// Z1 = Z2[-1] ^ Fσ(Z1[-1] ^ Z3[-1])
	xorBytes(z[0], z[2]);
	F(z[0]);
	xorBytes(z[0], z[1]);
	z[1].set(z1);
	// Z3 = Mb(Z3[-1] ^ G)
	xorBytes(z[2], g);
	mdshMul(z[2], 0xb);
	// Z4 = M5(Z4[-1])
	mdshMul(z[3], 0x5);
}

function combine(...rest)
{
	let length = 0;
	for (let i = 0; i < rest.length; i++)
	{
		const part = rest[i];
		length += part.length;
	}
	const result = new Uint8Array(length);
	let offset = 0;
	for (let i = 0; i < rest.length; i++)
	{
		const part = rest[i];
		result.set(part, offset);
		offset += part.length;
	}
	return result;
}

class HierocryptTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		precompute();

		this.checkBytesSize("Key", keyBytes, 128);

		const keys = this.generateKeys(keyBytes, ROUNDS);

		return this.transformBlocks(bytes, 64, keys, ROUNDS);
	}

	generateKeys(keyBytes, rounds)
	{
		const Z_ROWS = 4;

		const keys = new Array(rounds + 1);

		const rowLength = 4; // 8 for HC3

		const z = new Array(Z_ROWS);
		for (let i = 0; i < Z_ROWS; i++)
		{
			z[i] = Uint8Array.from(keyBytes.subarray(i * rowLength, (i + 1) * rowLength));
		}
		
		let gIndex = 0;

		// Pre-whitening:
		sigma(z, G[gIndex++]);

		const v = new Uint8Array(rowLength);

		const cRounds = Math.ceil((rounds + 1) / 2);
		for (let r = 0; r < cRounds; r++)
		{
			// K1 = Z1[-1]
			const k0 = Uint8Array.from(z[0]);
			// K4 = Z2[-1]
			const k3 = Uint8Array.from(z[1]);

			// V = Z2[-1]
			v.set(z[1]);

			P16(z[2], z[3]);
			sigma(z, G[gIndex++]);

			// V = Fσ(Z2[-1] ^ Z3)
			xorBytes(v, z[2]);
			F(v);

			// K2 = Z3
			const k1 = Uint8Array.from(z[2]);
			// K3 = Z4
			const k2 = Uint8Array.from(z[3]);

			// K1 = Z1[-1] ^ V
			xorBytes(k0, v);
			// K2 = Z3 ^ V
			xorBytes(k1, v);
			// K3 = Z4 ^ V
			xorBytes(k2, v);
			// K4 = Z2[-1] ^ Z4
			xorBytes(k3, z[3]);

			keys[r] = combine(k0, k1, k2, k3);
		}

		for (let r = cRounds; r < rounds + 1; r++)
		{
			// K1 = Z3[-1]
			const k0 = Uint8Array.from(z[2]);
			// K4 = Z1[-1]
			const k3 = Uint8Array.from(z[0]);

			// V = Fσ(Z1[-1] ^ Z3[-1])
			v.set(z[0]);
			xorBytes(v, z[2]);
			F(v);
			
			sigmaInv(z, G[--gIndex]);

			// K2 = W1
			const k1 = Uint8Array.from(z[2]);
			// K2 = W2
			const k2 = Uint8Array.from(z[3]);

			// K1 = Z3[-1] ^ Z1
			xorBytes(k0, z[0]);
			// K4 = Z1[-1] ^ W2
			xorBytes(k3, k2);
			// K2 = W1 ^ V
			xorBytes(k1, v);
			// K3 = W2 ^ V
			xorBytes(k2, v);

			P16inv(z[2], z[3]);

			keys[r] = combine(k0, k1, k2, k3);
		}

		return keys;
	}

	transformBlock(block, dest, destOffset, keys, rounds)
	{
		const state = Uint8Array.from(block);

		let k = 0;
		for (let r = 0; r < rounds - 1; r++)
		{
			this.XS(state, keys[k++]);
			MDSH(state, this.mdsh);
		}
		this.XS(state, keys[k++]);

		xorBytes(state, keys[k].subarray(0, 8));

		dest.set(state, destOffset);
	}
}

class HierocryptEncryptTransform extends HierocryptTransform
{
	constructor()
	{
		super(false);
		this.XS = XS;
		this.mdsh = MDSH1;
	}
}

class HierocryptDecryptTransform extends HierocryptTransform
{
	constructor()
	{
		super(true);
		this.XS = IXS;
		this.mdsh = MDSH1_INV;
	}

	generateKeys(keyBytes, rounds)
	{
		const keys = super.generateKeys(keyBytes, rounds);
		keys.reverse();

		// 0 - [rounds - 2]: MDSLinv row/word 3+4
		// 1 - [rounds - 1]: MDSHinv
		// [rounds - 1]    : MDSLinv row/word 3+4
		return keys;
	}
}

export {
	HierocryptEncryptTransform,
	HierocryptDecryptTransform
};