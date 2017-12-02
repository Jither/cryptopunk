import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt64sBE, int64sToBytesBE } from "../../cryptopunk.utils";
import { xor64, add64, mul64, shr64, or64, ZERO_64, sub64 } from "../../cryptopunk.bitarith";

// (SQRT(5) - 1) * 2^63
const DELTA = { hi: 0x9e3779b9, lo: 0x7f4a7c15 };

const SBOX_1_LENGTH = 0x2000;
const SBOX_2_LENGTH = 0x800;
const SBOX_1_POLY = 0x2911;
const SBOX_2_POLY = 0xaa7;

const MASK_11 = 0b11111111111;
const MASK_13 = 0b1111111111111;

let SBOX_1, SBOX_2, PERM;

// returns a*b mod p in GF(size)
function gfMul(a, b, p, size)
{
	let result = 0;
	while (b !== 0)
	{
		if ((b & 1) !== 0)
		{
			result ^= a;
		}
		a <<= 1;
		if (a >= size)
		{
			a ^= p;
		}
		b >>>= 1;
	}
	return result;
}

// Returns b^3 mod p in GF(size)
function gfExp3(b, p, size)
{
	if (b === 0)
	{
		return 0;
	}

	let result = b;
	result = gfMul(result, b, p, size); // ^2
	result = gfMul(result, b, p, size); // ^3
	return result;
}

function precompute()
{
	if (SBOX_1)
	{
		return;
	}

	SBOX_1 = new Uint8Array(SBOX_1_LENGTH);
	SBOX_2 = new Uint8Array(SBOX_2_LENGTH);

	const s1mask = SBOX_1_LENGTH - 1;
	const s2mask = SBOX_2_LENGTH - 1;

	for (let i = 0; i < SBOX_1_LENGTH; i++)
	{
		SBOX_1[i] = gfExp3(i ^ s1mask, SBOX_1_POLY, SBOX_1_LENGTH);
	}
	
	for (let i = 0; i < SBOX_2_LENGTH; i++)
	{
		SBOX_2[i] = gfExp3(i ^ s2mask, SBOX_2_POLY, SBOX_2_LENGTH);
	}

	PERM = new Array(256);
	for (let i = 0; i < 256; i++)
	{
		let k = 7;
		const p = { hi: 0, lo: 0 };
		for (let b = 0; b < 8; b++)
		{
			const val = ((i >>> b) & 1) << (k % 32);
			if (k >= 32)
			{
				p.hi |= val;
			}
			else
			{
				p.lo |= val;
			}
			k += 8;
		}
		PERM[i] = p;
	}
}

function KP(a, b)
{
	const k = b.lo;
	return {
		hi: (a.hi & ~k) | (a.lo & k),
		lo: (a.hi & k) | (a.lo & ~k)
	};
}

function E(a)
{
	return [
		SBOX_1[((a.lo & 0b11111) << 8) | (a.hi >>> 24)], // S1(bits 0-4, 56-63)
		SBOX_2[ (a.hi >>> 16) & MASK_11               ], // S2(bits 48-58)
		SBOX_1[ (a.hi >>>  8) & MASK_13               ], // S1(bits 40-52)
		SBOX_2[ (a.hi       ) & MASK_11               ], // S2(bits 32-42)
		SBOX_2[((a.hi & 0b00111) << 8) | (a.lo >>> 24)], // S2(bits 24-34)
		SBOX_1[ (a.lo >>> 16) & MASK_13               ], // S1(bits 16-28)
		SBOX_2[ (a.lo >>>  8) & MASK_11               ], // S2(bits 8-18)
		SBOX_1[ (a.lo       ) & MASK_13               ]  // S1(bits 0-12)
	];
}

function P(e)
{
	let result = { hi: 0, lo: 0 };
	for (let i = 0; i < 8; i++)
	{
		result = or64(result, shr64(PERM[e[i]], 7 - i));
	}
	return result;
}

function Sb(e, b)
{
	const k = b.hi;
	return {
		hi:
			(SBOX_2[ (e.hi >>> 24)         | ((k >>> 21) & 0x0700)] << 24) | // S2(bits B61-63, A56-63)
			(SBOX_2[((e.hi >>> 16) & 0xff) | ((k >>> 18) & 0x0700)] << 16) | // S2(bits B58-60, A48-55)
			(SBOX_1[((e.hi >>>  8) & 0xff) | ((k >>> 13) & 0x1f00)] <<  8) | // S1(bits B53-57, A40-47)
			(SBOX_1[( e.hi         & 0xff) | ((k >>>  8) & 0x1f00)]      ),  // S1(bits B48-52, A32-39)
		lo:
			(SBOX_2[ (e.lo >>> 24)         | ((k >>>  5) & 0x0700)] << 24) | // S2(bits B45-47, A24-31)
			(SBOX_2[((e.lo >>> 16) & 0xff) | ((k >>>  2) & 0x0700)] << 16) | // S2(bits B42-44, A16-23)
			(SBOX_1[((e.lo >>>  8) & 0xff) | ((k <<   3) & 0x1f00)] <<  8) | // S1(bits B37-41, A8-15)
			(SBOX_1[( e.lo         & 0xff) | ((k <<   8) & 0x1f00)]      )   // S1(bits B32-36, A0-7)
	};
}

function f(a, b)
{
	a = KP(a, b);
	const e = E(a);
	const p = P(e);
	return Sb(p, b);
}

class Loki97Transform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		precompute();

		this.checkBytesSize("Key", keyBytes, [128, 192, 256]);

		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 128, subKeys);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		let [left, right] = bytesToInt64sBE(block);

		for (let r = 0; r < 16; r++)
		{
			const k = r * 3;
			left = xor64(left, f(add64(right, subKeys[k]), subKeys[k + 1]));
			right = add64(right, subKeys[k], subKeys[k + 2]);
			[left, right] = [right, left];
		}

		dest.set(int64sToBytesBE([right, left]));
	}

	generateSubKeys(keyBytes)
	{
		const k = bytesToInt64sBE(keyBytes);

		let k1, k2, k3, k4;

		switch (k.length)
		{
			case 2:
				k1 = f(k[0], k[1]);
				k2 = f(k[1], k[0]);
				k3 = k[1];
				k4 = k[0];
				break;
			case 3:
				k1 = f(k[0], k[1]);
				k2 = k[2];
				k3 = k[1];
				k4 = k[0];
				break;
			case 4:
				k1 = k[3];
				k2 = k[2];
				k3 = k[1];
				k4 = k[0];
				break;
		}

		const keys = [];
		for (let i = 0; i < 48; i++)
		{
			const fv = f(add64(k1, k3, mul64(DELTA, { lo: i + 1, hi: 0 })), k2);
			keys[i] = xor64(k4, fv);
			k4 = k3;
			k3 = k2;
			k2 = k1;
			k1 = keys[i];
		}

		return keys;
	}
}

class Loki97EncryptTransform extends Loki97Transform
{
	constructor()
	{
		super(false);
	}
}

class Loki97DecryptTransform extends Loki97Transform
{
	constructor()
	{
		super(true);
	}

	generateSubKeys(keyBytes)
	{
		const keys = super.generateSubKeys(keyBytes);
		// Change 1st and 3rd key of each round to additive inverse:
		for (let i = 0; i < keys.length; i += 3)
		{
			keys[i] = sub64(ZERO_64, keys[i]);
			keys[i + 2] = sub64(ZERO_64, keys[i + 2]);
		}
		keys.reverse();
		return keys;
	}
}

export {
	Loki97EncryptTransform,
	Loki97DecryptTransform
};