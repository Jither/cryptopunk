import { BlockCipherTransform } from "./block-cipher";
import { ROOTS } from "../shared/constants";
import { bytesToHex, bytesToInt32sLE, int32sToHex, int32sToBytesLE } from "../../cryptopunk.utils";
import { rol } from "../../cryptopunk.bitarith";

const VARIANT_VALUES = [
	"0.5",
	"1.0"
];

const VARIANT_NAMES = [
	"CRYPTON 0.5",
	"CRYPTON 1.0"
];

const P0 = [15,  9,  6,  8,  9,  9,  4, 12,  6,  2,  6, 10,  1,  3,  5, 15];
const P1 = [10, 15,  4,  7,  5,  2, 14,  6,  9,  3, 12,  8, 13,  1, 11,  0];
const P2 = [ 0,  4,  8,  4,  2, 15,  8, 13,  1,  1, 15,  7,  2, 11, 14, 15];

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

let SBOX_0, SBOX_1, SBOXES;

// Non-linear substitution γ
function gamma(a, round)
{
	let box = (round + 1) % 2;
	for (let row = 0; row < 4; row++)
	{
		a[row] =
			(SBOXES[(box++) % 2][ a[row]         & 0xff]      ) |
			(SBOXES[(box++) % 2][(a[row] >>>  8) & 0xff] <<  8) |
			(SBOXES[(box++) % 2][(a[row] >>> 16) & 0xff] << 16) |
			(SBOXES[(box++) % 2][(a[row] >>> 24) & 0xff] << 24);
		box++;
	}
}

// Bit permutation π
function pi(a, round)
{
	const b = new Array(4);

	let aindex = round & 1 ? 0 : 3;
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
		const x = order[i];
		a[i] = (a[i] & M_ROW[ x         ]    ) ^ 
			rol(a[i] & M_ROW[(x + 1) % 4],  8) ^
			rol(a[i] & M_ROW[(x + 2) % 4], 16) ^
			rol(a[i] & M_ROW[(x + 3) % 4], 24);
	}
}

function precompute()
{
	if (SBOXES)
	{
		return;
	}

	SBOX_0 = new Array(256);
	SBOX_1 = new Array(256);

	// Generate 8x8 S-box from three 4x4:
	for (let x = 0; x < 256; x++)
	{
		let r = x & 0xf;
		let l = x >> 4;
		l ^= P0[r];
		r ^= P1[l];
		l ^= P2[r];
		const y = r ^ (l << 4);
		SBOX_0[x] = y;
		SBOX_1[y] = x;
	}
	
	SBOXES = [SBOX_0, SBOX_1];
}

function keyExpand(a, round, k)
{
	pi(a, round);
	sigma(a, k);
	gamma(a, round);
	tau(a);
}

function makeRoundKey0(ek, rot0, rot2, rc)
{
	return [
		rol(ek[0], rot0),
		ek[1] ^ rc,
		rol(ek[2], rot2),
		ek[3] ^ rc
	];
}

function makeRoundKey1(ek, rot1, rot3, rc)
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
		
		const ek = this.expandKey(keyBytes);
		const roundKeys = this.generateKeys(ek);
		
		return this.transformBlocks(bytes, 128, roundKeys);
	}

	transformBlock(block, dest, destOffset, roundKeys)
	{
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

	expandKey(keyBytes)
	{
		const padded = new Uint8Array(32);
		padded.set(keyBytes);
		const u = bytesToInt32sLE(padded);
		const v0 = [u[0], u[2], u[4], u[6]];
		const v1 = [u[1], u[3], u[5], u[7]];

		keyExpand(v0, 1, P);
		keyExpand(v1, 0, Q);

		const t0 = v0[0] ^ v0[1] ^ v0[2] ^ v0[3];
		const t1 = v1[0] ^ v1[1] ^ v1[2] ^ v1[3];

		const ek = new Array(8);
		for (let i = 0; i < 4; i++)
		{
			ek[i] = v0[i] ^ t1;
			ek[i + 4] = v1[i] ^ t0;
		}

		return ek;
	}
}

class CryptonEncryptTransform extends CryptonTransform
{
	constructor()
	{
		super(false);
	}

	generateKeys(ek)
	{
		const keys = new Array(13);

		keys[ 0] = ek.slice(0, 4);
		keys[ 1] = ek.slice(4);
		keys[ 2] = makeRoundKey0(keys[ 0],  8, 16, RC[0]);
		keys[ 3] = makeRoundKey1(keys[ 1], 16, 24, RC[0]);
		keys[ 4] = makeRoundKey1(keys[ 2], 24,  8, RC[1]);
		keys[ 5] = makeRoundKey0(keys[ 3],  8, 16, RC[1]);
		keys[ 6] = makeRoundKey0(keys[ 4], 16, 24, RC[2]);
		keys[ 7] = makeRoundKey1(keys[ 5], 24,  8, RC[2]);
		keys[ 8] = makeRoundKey1(keys[ 6],  8, 16, RC[3]);
		keys[ 9] = makeRoundKey0(keys[ 7], 16, 24, RC[3]);
		keys[10] = makeRoundKey0(keys[ 8], 24,  8, RC[4]);
		keys[11] = makeRoundKey1(keys[ 9],  8, 16, RC[4]);
		keys[12] = makeRoundKey1(keys[10], 16, 24, RC[5]);

		phi(keys[12], [1, 2, 3, 0]);
		
		return keys;
	}
}

class CryptonDecryptTransform extends CryptonTransform
{
	constructor()
	{
		super(true);
	}

	generateKeys(ek)
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
		
		keys[ 2] = makeRoundKey1(keys[ 0], 16, 24, RC[5]);
		keys[ 3] = makeRoundKey1(keys[ 1],  8, 16, RC[4]);
		keys[ 4] = makeRoundKey0(keys[ 2], 24,  8, RC[4]);
		keys[ 5] = makeRoundKey0(keys[ 3], 16, 24, RC[3]);
		keys[ 6] = makeRoundKey1(keys[ 4],  8, 16, RC[3]);
		keys[ 7] = makeRoundKey1(keys[ 5], 24,  8, RC[2]);
		keys[ 8] = makeRoundKey0(keys[ 6], 16, 24, RC[2]);
		keys[ 9] = makeRoundKey0(keys[ 7],  8, 16, RC[1]);
		keys[10] = makeRoundKey1(keys[ 8], 24,  8, RC[1]);
		keys[11] = makeRoundKey1(keys[ 9], 16, 24, RC[0]);
		keys[12] = ek.slice(0, 4);
		
		return keys;
	}
}

export {
	CryptonEncryptTransform,
	CryptonDecryptTransform
};