import { BlockCipherTransform } from "./block-cipher";
import { ROOTS } from "../shared/constants";
import { bytesToInt32sLE, int32sToBytesLE, bytesToHex, int32sToHex } from "../../cryptopunk.utils";
import { rol } from "../../cryptopunk.bitarith";

const VARIANT_VALUES = [
	"0.5",
	"1.0"
];

const VARIANT_NAMES = [
	"CRYPTON 0.5",
	"CRYPTON 1.0"
];

// Version 0.5 S-box permutations
const P0_V0 = [15,  9,  6,  8,  9,  9,  4, 12,  6,  2,  6, 10,  1,  3,  5, 15];
const P1_V0 = [10, 15,  4,  7,  5,  2, 14,  6,  9,  3, 12,  8, 13,  1, 11,  0];
const P2_V0 = [ 0,  4,  8,  4,  2, 15,  8, 13,  1,  1, 15,  7,  2, 11, 14, 15];

// Version 1.0 S-box permutations
const P0_V1  = [15, 14, 10,  1, 11,  5,  8, 13,  9,  3,  2,  7,  0,  6,  4, 12];
const P1_V1  = [11, 10, 13,  7,  8, 14,  0,  5, 15,  6,  3,  4,  1,  9,  2, 12];
const IP0_V1 = [12,  3, 10,  9, 14,  5, 13, 11,  6,  8,  2,  4, 15,  7,  1,  0];
const IP1_V1 = [ 6, 12, 14, 10, 11,  7,  9,  3,  4, 13,  1,  0, 15,  2,  5,  8];

const M = [
	0x3fcff3fc,
	0xfc3fcff3,
	0xf3fc3fcf,
	0xcff3fc3f
];

const M_ROW = [
	0xcffccffc,
	0x3ff33ff3,
	0xfccffccf,
	0xf33ff33f
];

const P = [	ROOTS.SQRT3, ROOTS.SQRT5, ROOTS.SQRT7, ROOTS.SQRT11 ];
const Q = [ ROOTS.SQRT13, ROOTS.SQRT17, ROOTS.SQRT19, ROOTS.SQRT23 ];

const RC = [0x01010101, 0x02020202, 0x04040404, 0x08080808, 0x10101010, 0x20202020];

let CE, CD, MC;

let SBOXES_V0;
let SBOXES_V1;

// Non-linear substitution γ - version 0.5
// 2 S-boxes
function gammaV0(a, round)
{
	let box = (round & 1) ? 0 : 1;
	for (let row = 0; row < 4; row++)
	{
		a[row] =
			(SBOXES_V0[(box++) % 2][ a[row]         & 0xff]      ) |
			(SBOXES_V0[(box++) % 2][(a[row] >>>  8) & 0xff] <<  8) |
			(SBOXES_V0[(box++) % 2][(a[row] >>> 16) & 0xff] << 16) |
			(SBOXES_V0[(box++) % 2][(a[row] >>> 24) & 0xff] << 24);
		box++;
	}
}

// Non-linear substitution γ - version 1.0
// 4 S-boxes
function gammaV1(a, round)
{
	let box = (round & 1) ? 0 : 2;
	for (let row = 0; row < 4; row++)
	{
		a[row] =
			(SBOXES_V1[(box + 0) % 4][ a[row]         & 0xff]      ) |
			(SBOXES_V1[(box + 1) % 4][(a[row] >>>  8) & 0xff] <<  8) |
			(SBOXES_V1[(box + 2) % 4][(a[row] >>> 16) & 0xff] << 16) |
			(SBOXES_V1[(box + 3) % 4][(a[row] >>> 24) & 0xff] << 24);
		box++;
	}
}

// Bit permutation π
// Note that v0.5 and v1.0 differ here in the offset for even rounds:
// v0.5: πe(A[3],A[2],A[1],A[0]) = πo(A[2],A[1],A[0],A[3])
// v1.0: πe(A[3],A[2],A[1],A[0]) = πo(A[1],A[0],A[3],A[2])
// evenOffset is the index of πo that A[0] in πe maps to - 3 for v0.5, 2 for v1.0
function _pi(a, round, evenOffset)
{
	const b = new Array(4);

	let aindex = (round & 1) ? 0 : evenOffset;
	for (let col = 0; col < 4; col++)
	{
		let mindex = col;
		let val = 0;
		for (let row = 0; row < 4; row++)
		{
			val ^= a[aindex % 4] & M[mindex % 4];
			aindex++;
			mindex++;
		}
		b[col] = val;
	}
	[a[0], a[1], a[2], a[3]] = b;
}

function piV0(a, round)
{
	_pi(a, round, 3);
}

function piV1(a, round)
{
	_pi(a, round, 2);
}

// Byte transposition τ
function tau(a)
{
	// TODO: Inplace transpose
	const b = new Array(4);
	for (let i = 0; i < 4; i++)
	{
		b[i] =
			((a[0] >>> ((i * 8)) & 0xff) <<  0) |
			((a[1] >>> ((i * 8)) & 0xff) <<  8) |
			((a[2] >>> ((i * 8)) & 0xff) << 16) |
			((a[3] >>> ((i * 8)) & 0xff) << 24);
	}

	[a[0], a[1], a[2], a[3]] = b;
}

// Key addition σ
function sigma(a, k)
{
	for (let i = 0; i < 4; i++)
	{
		a[i] ^= k[i];
	}
}

// Row permutation φ
function phi(a, order)
{
	for (let i = 0; i < 4; i++)
	{
		a[i] = phiX(a[i], order[i]);
	}
}

function phiX(a, x)
{
	return (a & M_ROW[ x         ]    ) ^ 
		rol(a & M_ROW[(x + 1) % 4],  8) ^
		rol(a & M_ROW[(x + 2) % 4], 16) ^
		rol(a & M_ROW[(x + 3) % 4], 24);	
}

function precompute()
{
	if (SBOXES_V0)
	{
		return;
	}

	// Generate 8x8 S-boxes from 4x4:

	// Version 0.5:
	let sbox0 = new Array(256);
	let sbox1 = new Array(256);

	for (let x = 0; x < 256; x++)
	{
		let l = x >> 4;
		let r = x & 0xf;
		l ^= P0_V0[r];
		r ^= P1_V0[l];
		l ^= P2_V0[r];
		const y = r ^ (l << 4);
		sbox0[x] = y;
		sbox1[y] = x;
	}
	
	SBOXES_V0 = [sbox0, sbox1];

	// Version 1.0:
	sbox0 = new Array(256);
	sbox1 = new Array(256);
	const sbox2 = new Array(256);
	const sbox3 = new Array(256);
	
	for (let x = 0; x < 256; x++)
	{
		let l = x >> 4;
		let r = x & 0xf;
		l = P1_V1[l];
		r = P0_V1[r];
		let yl = (l & 0xe) ^ 
			((l << 3) & 0x8) ^ ((l >> 3) & 0x1) ^ 
			((r << 1) & 0xa) ^ ((r << 2) & 0x4) ^ 
			((r >> 2) & 0x2) ^ ((r >> 1) & 0x1);
		
		let yr = (r & 0xd) ^
			((r << 1) & 0x4) ^ ((r >> 1) & 0x2) ^
			((l >> 1) & 0x5) ^ ((l << 2) & 0x8) ^
			((l << 1) & 0x2) ^ ((l >> 2) & 0x1);
		
		const y = IP0_V1[yl] | (IP1_V1[yr] << 4);

		// Rotate:
		yr = ((y << 3) | (y >> 5)) & 0xff;
		yl = ((y << 1) | (y >> 7)) & 0xff;
		r  = ((x << 3) | (x >> 5)) & 0xff;
		l  = ((x << 1) | (x >> 7)) & 0xff;

		sbox0[x] = yl;
		sbox1[x] = yr;
		sbox2[l] = y;
		sbox3[r] = y;
	}
	SBOXES_V1 = [sbox0, sbox1, sbox2, sbox3];

	// Round constants, version 1.0:
	// Encryption:
	CE = new Array(13);
	CE[0] = ROOTS.SQRT7;

	for (let i = 1; i < CE.length; i++)
	{
		CE[i] = (CE[i - 1] + ROOTS.SQRT5) & 0xffffffff;
	}

	// Decryption:
	CD = new Array(13);
	for (let i = 0; i < CE.length; i++)
	{
		CD[i] = phiX(CE[12 - i], i & 1 ? 0 : 2);
	}

	// Masking constants, version 1.0:
	MC = new Array(4);
	MC[0] = 0xacacacac;
	for (let i = 1; i < MC.length; i++)
	{
		MC[i] = rol(MC[i - 1], 1);
	}
}

function keyExpand(a, round, k)
{
	piV0(a, round);
	sigma(a, k);
	gammaV0(a, round);
	tau(a);
}

function xorEncRoundConstants(k, kOffset, c)
{
	const result = new Array(4);
	for (let i = 0; i < 4; i++)
	{
		result[i] = k[i + kOffset] ^ c ^ MC[i];
	}
	return result;
}

function xorDecRoundConstants(k, kOffset, c)
{
	const result = new Array(4);
	for (let i = 0; i < 4; i++)
	{
		result[i] = k[i + kOffset] ^ rol(c, 32 - 8 * i) ^ MC[i];
	}
	return result;
}

// Rotate individual bytes in dword left by count
function rolb(word, count)
{
	const mask = (0xff >> count) * 0x01010101;
	return ((word & mask) << count) | ((word & ~mask) >>> (8 - count));
}

function makeRoundKeyO(ek, rot0, rot2, rc)
{
	return [
		rol(ek[0], rot0),
		ek[1] ^ rc,
		rol(ek[2], rot2),
		ek[3] ^ rc
	];
}

function makeRoundKeyE(ek, rot1, rot3, rc)
{
	return [
		ek[0] ^ rc,
		rol(ek[1], rot1),
		ek[2] ^ rc,
		rol(ek[3], rot3)
	];
}

class CryptonTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("variant", "Variant", "1.0", { type: "select", values: VARIANT_VALUES, texts: VARIANT_NAMES });
	}

	transform(bytes, keyBytes)
	{
		precompute();
		
		this.checkBytesSize("Key", keyBytes, { min: 64, max: 256, step: 32 });
		
		const variant = this.options.variant;

		const ek = variant === "0.5" ? this.expandKeyV0(keyBytes) : this.expandKeyV1(keyBytes);
		const roundKeys = variant === "0.5" ? this.generateKeysV0(ek) : this.generateKeysV1(ek);
		
		return this.transformBlocks(bytes, 128, roundKeys);
	}

	transformBlock(block, dest, destOffset, roundKeys)
	{
		const { gamma, pi } = this.getVariantSpecifics();
		const a = bytesToInt32sLE(block);
		
		sigma(a, roundKeys[0]);
		
		for (let r = 1; r < 12; r++)
		{
			gamma(a, r);
			pi(a, r);
			tau(a);
			sigma(a, roundKeys[r]);
		}
		gamma(a, 12);
		tau(a);
		sigma(a, roundKeys[12]);
		
		dest.set(int32sToBytesLE(a), destOffset);
	}

	getVariantSpecifics()
	{
		const variant = this.options.variant;
		return {
			gamma: variant === "0.5" ? gammaV0 : gammaV1,
			pi: variant === "0.5" ? piV0 : piV1
		};
	}

	_expandKey(u, v)
	{
		const t0 = u[0] ^ u[1] ^ u[2] ^ u[3];
		const t1 = v[0] ^ v[1] ^ v[2] ^ v[3];

		const ek = new Array(8);
		for (let i = 0; i < 4; i++)
		{
			ek[i] = u[i] ^ t1;
			ek[i + 4] = v[i] ^ t0;
		}

		return ek;
	}

	expandKeyV0(keyBytes)
	{
		const padded = new Uint8Array(32);
		padded.set(keyBytes);
		const p = bytesToInt32sLE(padded);
		const u = [p[0], p[2], p[4], p[6]];
		const v = [p[1], p[3], p[5], p[7]];

		keyExpand(u, 1, P);
		keyExpand(v, 0, Q);

		return this._expandKey(u, v);
	}

	expandKeyV1(keyBytes)
	{
		const padded = new Uint8Array(32);
		padded.set(keyBytes);
		const u = new Array(4);
		const v = new Array(4);
		for (let i = 0; i < 4; i++)
		{
			// Note that we've skipped the step where the key is actually read as Little Endian dwords.
			// This means that U/V:
			// U: 6 4 2 0
			// V: 7 5 3 1
			// ... actually maps to bytes:
			// U: 5 7 1 3
			// V: 4 6 0 2
			const i8 = i * 8;
			u[i] = (padded[i8 + 5] << 24) | (padded[i8 + 7] << 16) | (padded[i8 + 1] << 8) | padded[i8 + 3];
			v[i] = (padded[i8 + 4] << 24) | (padded[i8 + 6] << 16) | (padded[i8    ] << 8) | padded[i8 + 2];
		}

		gammaV1(u, 1);
		piV1(u, 1);
		tau(u);
		
		gammaV1(v, 0);
		piV1(v, 0);
		tau(v);

		return this._expandKey(u, v);
	}
}

class CryptonEncryptTransform extends CryptonTransform
{
	constructor()
	{
		super(false);
	}

	generateKeysV0(ek)
	{
		const keys = new Array(13);

		keys[ 0] = ek.slice(0, 4);
		keys[ 1] = ek.slice(4);
		keys[ 2] = makeRoundKeyO(keys[ 0],  8, 16, RC[0]);
		keys[ 3] = makeRoundKeyE(keys[ 1], 16, 24, RC[0]);
		keys[ 4] = makeRoundKeyE(keys[ 2], 24,  8, RC[1]);
		keys[ 5] = makeRoundKeyO(keys[ 3],  8, 16, RC[1]);
		keys[ 6] = makeRoundKeyO(keys[ 4], 16, 24, RC[2]);
		keys[ 7] = makeRoundKeyE(keys[ 5], 24,  8, RC[2]);
		keys[ 8] = makeRoundKeyE(keys[ 6],  8, 16, RC[3]);
		keys[ 9] = makeRoundKeyO(keys[ 7], 16, 24, RC[3]);
		keys[10] = makeRoundKeyO(keys[ 8], 24,  8, RC[4]);
		keys[11] = makeRoundKeyE(keys[ 9],  8, 16, RC[4]);
		keys[12] = makeRoundKeyE(keys[10], 16, 24, RC[5]);

		phi(keys[12], [1, 2, 3, 0]);
		
		return keys;
	}

	generateKeysV1(ek)
	{
		const keys = new Array(13);

		keys[ 0] = xorEncRoundConstants(ek, 0, CE[0]);
		keys[ 1] = xorEncRoundConstants(ek, 4, CE[1]);

		for (let r = 2; r < 13; r++)
		{
			if ((r & 1) === 0)
			{
				const ek0 = ek[0];
				ek[0] = rol( ek[1], 24);
				ek[1] = rol( ek[2], 16);
				ek[2] = rolb(ek[3],  6);
				ek[3] = rolb(ek0  ,  6);
				keys[r] = xorEncRoundConstants(ek, 0, CE[r]);
			}
			else
			{
				const ek7 = ek[7];
				ek[7] = rol( ek[6], 16);
				ek[6] = rol( ek[5],  8);
				ek[5] = rolb(ek[4],  2);
				ek[4] = rolb(ek7  ,  2);
				keys[r] = xorEncRoundConstants(ek, 4, CE[r]);
			}
		}

		// TODO: Should this actually be here?
		phi(keys[12], [2,3,0,1]);
		
		return keys;
	}
}

class CryptonDecryptTransform extends CryptonTransform
{
	constructor()
	{
		super(true);
	}

	generateKeysV0(ek)
	{
		const keys = new Array(13);

		const k0 = keys[0] = ek.slice(0, 4);
		const k1 = keys[1] = ek.slice(4);

		phi(k0, [3, 0, 1, 2]);
		phi(k1, [3, 3, 3, 1]);

		k0[0] ^= RC[1] ^ RC[3] ^ RC[5];
		k0[1] ^= RC[0] ^ RC[2] ^ RC[4];
		k0[2] ^= RC[1] ^ RC[3] ^ RC[5];
		k0[3] ^= RC[0] ^ RC[2] ^ RC[4];

		k1[0] ^= RC[0] ^ RC[2] ^ RC[4];
		k1[1] ^= RC[1] ^ RC[3];
		k1[2] ^= RC[0] ^ RC[2] ^ RC[4];
		k1[3] ^= RC[1] ^ RC[3];

		keys[ 2] = makeRoundKeyE(keys[ 0], 16, 24, RC[5]);
		keys[ 3] = makeRoundKeyE(keys[ 1],  8, 16, RC[4]);
		keys[ 4] = makeRoundKeyO(keys[ 2], 24,  8, RC[4]);
		keys[ 5] = makeRoundKeyO(keys[ 3], 16, 24, RC[3]);
		keys[ 6] = makeRoundKeyE(keys[ 4],  8, 16, RC[3]);
		keys[ 7] = makeRoundKeyE(keys[ 5], 24,  8, RC[2]);
		keys[ 8] = makeRoundKeyO(keys[ 6], 16, 24, RC[2]);
		keys[ 9] = makeRoundKeyO(keys[ 7],  8, 16, RC[1]);
		keys[10] = makeRoundKeyE(keys[ 8], 24,  8, RC[1]);
		keys[11] = makeRoundKeyE(keys[ 9], 16, 24, RC[0]);
		keys[12] = ek.slice(0, 4);
		
		return keys;
	}

	generateKeysV1(ek)
	{
		const keys = new Array(13);

		// TODO: Should this be here? Doesn't match paper's RK 12
		keys[12] = [
			ek[0] ^ CE[0] ^ MC[0],
			ek[1] ^ CE[0] ^ MC[1],
			ek[2] ^ CE[0] ^ MC[2],
			ek[3] ^ CE[0] ^ MC[3]
		];

		let ek3 = ek[3];
		const ek2 = ek[2];
		ek[3] = rolb(phiX(ek[1], 0), 2);
		ek[2] =      phiX(ek[0], 1);
		ek[1] = rolb(phiX(ek3  , 1), 2);
		ek[0] = rolb(phiX(ek2  , 2), 4);

		const ek7 = ek[7];
		ek[7] = rolb(phiX(ek[6], 2), 4);
		ek[6] = rolb(phiX(ek[5], 0), 4);
		ek[5] = rolb(phiX(ek[4], 1), 6);
		ek[4] = rolb(phiX(ek7  , 0), 6);

		keys[ 0] = xorDecRoundConstants(ek, 0, CD[0]);
		keys[ 1] = xorDecRoundConstants(ek, 4, CD[1]);

		// TODO: Should this include RK12?
		for (let r = 2; r < 12; r++)
		{
			if ((r & 1) === 0)
			{
				ek3 = ek[3];
				ek[3] = rolb(ek[2],  2);
				ek[2] = rol( ek[1],  8);
				ek[1] = rol( ek[0], 16);
				ek[0] = rolb(ek3  ,  2);
				keys[r] = xorDecRoundConstants(ek, 0, CD[r]);
			}
			else
			{
				const ek4 = ek[4];
				ek[4] = rolb(ek[5],  6);
				ek[5] = rol( ek[6], 16);
				ek[6] = rol( ek[7], 24);
				ek[7] = rolb(ek4  ,  6);
				keys[r] = xorDecRoundConstants(ek, 4, CD[r]);
			}
		}

		return keys;
	}
}

export {
	CryptonEncryptTransform,
	CryptonDecryptTransform
};