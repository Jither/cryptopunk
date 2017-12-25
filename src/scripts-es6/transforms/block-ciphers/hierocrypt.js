import { BlockCipherTransform } from "./block-cipher";
import { gfExp256, gfMulTable } from "../../cryptopunk.galois";
import { permutateBits, xorBytes } from "../../cryptopunk.bitarith";
import { ROOTS } from "../shared/constants";

const VARIANT_VALUES = [
	1,
	3
];

const VARIANT_NAMES = [
	"Hierocrypt-L1",
	"Hierocrypt-3"
];

const ROUNDS = {
	128: 6, // Both L1 and HC-3 with 128 bit key use 6 rounds
	192: 7,
	256: 8
};

const HIEROCRYPT_POLYNOMIAL = 0x163;

const H = [
	ROOTS.SQRT2_DIV4,
	ROOTS.SQRT3_DIV4,
	ROOTS.SQRT5_DIV4,
	ROOTS.SQRT10_DIV4,
	ROOTS.SQRT15_DIV4
];

const Z_ROWS = 4;

// Concatenations of H/G 32-bit values to 64-bit:
const G_32_TO_64 = [
	[3, 0], // H4 | H1
	[2, 1], // H3 | H2
	[1, 3], // H2 | H4
	[0, 2], // H1 | H3
	[2, 3], // H3 | H4
	[1, 0], // H2 | H1 - for pre-whitening
	[2, 1], // H3 | H2 - for padding 128-bit key
	[1, 2]  // H2 | H3 - for padding 192-bit key
];

// Hierocrypt-L1 constants
const G_INDEX1 = [1, 2, 3, 4, 4, 3, 2];

const MDSH1 = [
	[0x5, 0x7],
	[0xa, 0xb]
];

const MDSH1_INV = [
	[0xc, 0xa],
	[0x5, 0xb]
];

// Hierocrypt-3 constants
const G_INDEX3 = {
	128: [0, 1, 2, 3, 3, 2, 1],
	192: [1, 0, 3, 2, 2, 3, 0, 1],
	256: [4, 0, 2, 1, 3, 3, 1, 2, 0]
};

const MDSH3 = [
	[0x5, 0x5, 0xa, 0xe],
	[0xe, 0x5, 0x5, 0xa],
	[0xa, 0xe, 0x5, 0x5],
	[0x5, 0xa, 0xe, 0x5]
];

const MDSH3_INV = [
	[0xb, 0xe, 0xe, 0x6],
	[0x6, 0xb, 0xe, 0xe],
	[0xe, 0x6, 0xb, 0xe],
	[0xe, 0xe, 0x6, 0xb]
];

// Precomputed tables:
let G1, G3;

let SBOX, ISBOX;

let MULc4, MUL65, MULc8, MUL8b;
let MUL82, MUL34, MULf6;

function precomputeGseq(G, k)
{
	const result = new Array(k.length);
	for (let i = 0; i < k.length; i++)
	{
		result[i] = G[k[i]];
	}
	result.prewhitening = G[5];
	result.pad128 = precomputeG(3, 2);
	result.pad192 = precomputeG(2, 3);
	
	return result;
}

function precomputeG(gIndex0, gIndex1)
{
	const g = new Uint8Array(8);
	const left = H[gIndex0];
	const right = H[gIndex1];
	for (let i = 0; i < 4; i++)
	{
		g[i] = left >>> ((3 - i) * 8);
	}
	for (let i = 0; i < 4; i++)
	{
		g[i + 4] = right >>> ((3 - i) * 8);
	}

	return g;
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

	// Convert H constants to 32 bit byte arrays:
	const g32 = new Array(H.length);
	for (let gIndex = 0; gIndex < H.length; gIndex++)
	{
		const g = g32[gIndex] = new Uint8Array(4);
		for (let i = 0; i < 4; i++)
		{
			g[i] = (H[gIndex] >>> ((3 - i) * 8)) & 0xff;
		}
	}
	// Put into sequence for HC-L1 key schedule:
	G1 = new Array(G_INDEX1.length);
	for (let i = 0; i < G_INDEX1.length; i++)
	{
		G1[i] = g32[G_INDEX1[i]];
	}

	G1.prewhitening = g32[0];

	// Convert H constants to 64 bit byte arrays (concatenations):
	const g64 = new Array(G_32_TO_64.length);
	for (let gIndex = 0; gIndex < G_32_TO_64.length; gIndex++)
	{
		g64[gIndex] = precomputeG(G_32_TO_64[gIndex][0], G_32_TO_64[gIndex][1]);
	}

	// Put into sequence for HC-3 key schedule:
	G3 = {};
	G3[128] = precomputeGseq(g64, G_INDEX3[128]);
	G3[192] = precomputeGseq(g64, G_INDEX3[192]);
	G3[256] = precomputeGseq(g64, G_INDEX3[256]);
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

function MDSL(x)
{
	for (let i = 0; i < x.length; i += 4)
	{
		mdsL(x.subarray(i, i + 4));
	}
}

function MDSLinv(x)
{
	for (let i = 0; i < x.length; i += 4)
	{
		mdsLinv(x.subarray(i, i + 4));
	}
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

function MDSH(x, mdsh)
{
	const temp = new Uint8Array(4);
	const out = new Uint8Array(x.length);
	const mdshLength = mdsh.length;
	for (let i = 0; i < mdshLength; i++)
	{
		for (let j = 0; j < mdshLength; j++)
		{
			for (let k = 0; k < 4; k++)
			{
				temp[k] = x[j * 4 + k];
			}
			mdshMul(temp, mdsh[i][j]);
			for (let k = 0; k < 4; k++)
			{
				out[i * 4 + k] ^= temp[k];
			}
		}
	}
	x.set(out);
}

function S(x, sbox)
{
	for (let i = 0; i < x.length; i++)
	{
		x[i] = sbox[x[i]];
	}
}

function XS(x, k1, k2)
{
	xorBytes(x, k1);
	S(x, SBOX);
	MDSL(x);
	xorBytes(x, k2);
	S(x, SBOX);
}

function IXS(x, k1, k2)
{
	xorBytes(x, k1);
	S(x, ISBOX);
	MDSLinv(x);
	xorBytes(x, k2);
	S(x, ISBOX);
}

function P8(x)
{
	x[0] ^= x[2];
	x[1] ^= x[3];
	x[2] ^= x[1];
	x[3] ^= x[0];
}

// x0x1 x2x3 x4x5 x6x7
//  |    |    |    |
//  X----+----o    |
//  |    |    |    |
//  |    X----+----o
//  |    |    |    |
//  |    o----X    |
//  |    |    |    |
//  o----+----+----X
//  |    |    |    |
// x0x1 x2x3 x4x5 x6x7
function P16(x)
{
	x[0] ^= x[4];
	x[1] ^= x[5];
	x[2] ^= x[6];
	x[3] ^= x[7];
	x[4] ^= x[2];
	x[5] ^= x[3];
	x[6] ^= x[0];
	x[7] ^= x[1];
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
function P16_1(x, y)
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
function P16Inv1(x, y)
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

// x0-3 x4-7 y0-3 y4-7
//  |    |    |    |
//  X----+----o    |
//  |    |    |    |
//  |    X----+----o
//  |    |    |    |
//  |    o----X    |
//  |    |    |    |
//  o----+----+----X
//  |    |    |    |
// x0-3 x4-7 y0-3 y4-7
function P32(x, y)
{
	x[0] ^= y[0];
	x[1] ^= y[1];
	x[2] ^= y[2];
	x[3] ^= y[3];

	x[4] ^= y[4];
	x[5] ^= y[5];
	x[6] ^= y[6];
	x[7] ^= y[7];

	y[0] ^= x[4];
	y[1] ^= x[5];
	y[2] ^= x[6];
	y[3] ^= x[7];

	y[4] ^= x[0];
	y[5] ^= x[1];
	y[6] ^= x[2];
	y[7] ^= x[3];
}

// x0-3 x4-7 y0-3 y4-7
//  |    |    |    |
//  o----+----+----X
//  |    |    |    |
//  |    o----X    |
//  |    |    |    |
//  |    X----+----o
//  |    |    |    |
//  X----+----o    |
//  |    |    |    |
// x0-3 x4-7 y0-3 y4-7
function P32inv(x, y)
{
	y[4] ^= x[0];
	y[5] ^= x[1];
	y[6] ^= x[2];
	y[7] ^= x[3];

	y[0] ^= x[4];
	y[1] ^= x[5];
	y[2] ^= x[6];
	y[3] ^= x[7];

	x[4] ^= y[4];
	x[5] ^= y[5];
	x[6] ^= y[6];
	x[7] ^= y[7];

	x[0] ^= y[0];
	x[1] ^= y[1];
	x[2] ^= y[2];
	x[3] ^= y[3];
}

function F1(x)
{
	S(x, SBOX);
	P8(x);
}

function F3(x)
{
	S(x, SBOX);
	P16(x);
}

function sigma1(z, g)
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
	F1(z[1]);
	xorBytes(z[1], z0);
}

function sigma1Inv(z, g)
{
	// Z2 = Z1[-1]
	const z1 = Uint8Array.from(z[0]);
	// Z1 = Z2[-1] ^ Fσ(Z1[-1] ^ Z3[-1])
	xorBytes(z[0], z[2]);
	F1(z[0]);
	xorBytes(z[0], z[1]);
	z[1].set(z1);
	// Z3 = Mb(Z3[-1] ^ G)
	xorBytes(z[2], g);
	mdshMul(z[2], 0xb);
	// Z4 = M5(Z4[-1])
	mdshMul(z[3], 0x5);
}

function sigma3(z, g)
{
	// Z3 = M5e(Z3[-1]) ^ G
	mdshMul(z[2].subarray(0,4), 0x5);
	mdshMul(z[2].subarray(4,8), 0xe);
	xorBytes(z[2], g);
	// Z4 = M5e(Z4[-1])
	mdshMul(z[3].subarray(0,4), 0x5);
	mdshMul(z[3].subarray(4,8), 0xe);
	// Z1 = Z2[-1];
	const z0 = Uint8Array.from(z[0]);
	z[0].set(z[1]);
	// Z2 = Z1[-1] ^ Fσ(Z2[-1] ^ Z3)
	xorBytes(z[1], z[2]);
	F3(z[1]);
	xorBytes(z[1], z0);
}

function sigma3Inv(z, g)
{
	// Z2 = Z1[-1]
	const z1 = Uint8Array.from(z[0]);
	// Z1 = Z2[-1] ^ Fσ(Z1[-1] ^ Z3[-1])
	xorBytes(z[0], z[2]);
	F3(z[0]);
	xorBytes(z[0], z[1]);
	z[1].set(z1);
	// Z3 = Mb3(Z3[-1] ^ G)
	xorBytes(z[2], g);
	mdshMul(z[2].subarray(0,4), 0xb);
	mdshMul(z[2].subarray(4,8), 0x3);
	// Z4 = Mb3(Z4[-1])
	mdshMul(z[3].subarray(0,4), 0xb);
	mdshMul(z[3].subarray(4,8), 0x3);
}

function combine(k1l, k1r, k2l, k2r)
{
	const inLength = k1l.length;
	const outLength = inLength * 2;
	const k1 = new Uint8Array(outLength);
	const k2 = new Uint8Array(outLength);
	k1.set(k1l);
	k1.set(k1r, inLength);
	k2.set(k2l);
	k2.set(k2r, inLength);
	return [k1, k2];
}

class HierocryptTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("variant", "Variant", 1, { type: "select", values: VARIANT_VALUES, texts: VARIANT_NAMES });
	}

	transform(bytes, keyBytes)
	{
		const variant = this.options.variant;
		precompute();

		const requiredKeySize = variant === 1 ? 128 : [128, 192, 256];
		const keySize = this.checkBytesSize("Key", keyBytes, requiredKeySize);
		const blockSize = variant === 1 ? 64 : 128;
		const rounds = ROUNDS[keySize];

		const keys = this.generateKeys(keyBytes, rounds, variant);

		return this.transformBlocks(bytes, blockSize, keys, rounds);
	}

	generateInitialKey(keyBytes, G)
	{
		const z = new Array(Z_ROWS);
		if (this.options.variant === 1)
		{
			for (let i = 0; i < Z_ROWS; i++)
			{
				z[i] = Uint8Array.from(keyBytes.subarray(i * 4, (i + 1) * 4));
			}
		}
		else
		{
			z[0] = Uint8Array.from(keyBytes.subarray(0, 8));
			z[1] = Uint8Array.from(keyBytes.subarray(8, 16));
			switch (keyBytes.length)
			{
				case 16:
					// Z3 = K1
					z[2] = Uint8Array.from(keyBytes.subarray(0, 8));
					// Z4 = H3 | H2
					z[3] = Uint8Array.from(G.pad128);
					break;
				case 24:
					// Z3 = K3
					z[2] = Uint8Array.from(keyBytes.subarray(16, 24));
					// Z4 = H2 | H3
					z[3] = Uint8Array.from(G.pad192);
					break;
				case 32:
					// Z3 = K3
					z[2] = Uint8Array.from(keyBytes.subarray(16, 24));
					// Z4 = K4
					z[3] = Uint8Array.from(keyBytes.subarray(24, 32));
					break;
			}
		}
		return z;
	}

	generateKeys(keyBytes, rounds, variant)
	{
		let rowLength, F, G, P, Pinv, sigma, sigmaInv;
		const keySize = keyBytes.length * 8;
		if (variant === 1)
		{
			rowLength = 4;
			F = F1;
			G = G1;
			P = P16_1;
			Pinv = P16Inv1;
			sigma = sigma1;
			sigmaInv = sigma1Inv;
		}
		else
		{
			rowLength = 8;
			F = F3;
			G = G3[keySize];
			P = P32;
			Pinv = P32inv;
			sigma = sigma3;
			sigmaInv = sigma3Inv;
		}

		const keys = new Array(rounds + 1);

		const z = this.generateInitialKey(keyBytes, G);

		let gIndex = 0;

		// Pre-whitening:
		sigma(z, G.prewhitening);

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

			P(z[2], z[3]);
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
			
			sigmaInv(z, G[gIndex++]);

			// K2 = W1
			const k1 = Uint8Array.from(z[2]);
			// K2 = W2
			const k2 = Uint8Array.from(z[3]);

			// K4 = Z1[-1] ^ W2
			xorBytes(k3, k2);
			// K3 = W2 ^ V
			xorBytes(k2, v);
			// K2 = W1 ^ V
			xorBytes(k1, v);
			// K1 = Z3[-1] ^ Z1
			xorBytes(k0, z[0]);

			Pinv(z[2], z[3]);

			keys[r] = combine(k0, k1, k2, k3);
		}

		return keys;
	}

	transformBlock(block, dest, destOffset, keys, rounds)
	{
		const state = Uint8Array.from(block);
		const mdsh = this.options.variant === 1 ? this.mdsh1 : this.mdsh3;

		let k = 0, key;
		for (let r = 0; r < rounds - 1; r++)
		{
			key = keys[k++];
			this.XS(state, key[0], key[1]);
			MDSH(state, mdsh);
		}
		key = keys[k++];
		this.XS(state, key[0], key[1]);
		key = keys[k];
		xorBytes(state, key[0]);

		dest.set(state, destOffset);
	}
}

class HierocryptEncryptTransform extends HierocryptTransform
{
	constructor()
	{
		super(false);
		this.XS = XS;
		this.mdsh1 = MDSH1;
		this.mdsh3 = MDSH3;
	}
}

class HierocryptDecryptTransform extends HierocryptTransform
{
	constructor()
	{
		super(true);
		// Decryption uses inverse XS and MDSH
		this.XS = IXS;
		this.mdsh1 = MDSH1_INV;
		this.mdsh3 = MDSH3_INV;
	}

	generateKeys(keyBytes, rounds, G)
	{
		const keys = super.generateKeys(keyBytes, rounds, G);
		const mdsh = this.options.variant === 1 ? this.mdsh1 : this.mdsh3;
		// Reverse order of keys:
		keys.reverse();

		// To use equivalent encryption/decryption, transform keys:
		for (let r = 0; r < rounds; r++)
		{
			if (r > 0)
			{
				MDSH(keys[r][0], mdsh);
			}
			keys[r][1].set(keys[r + 1][1]);
			MDSLinv(keys[r][1]);
		}

		return keys;
	}
}

export {
	HierocryptEncryptTransform,
	HierocryptDecryptTransform
};