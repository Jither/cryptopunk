import { BlockCipherTransform } from "./block-cipher";
import { rorBytes, xorBytes, ror16, rol16 } from "../../cryptopunk.bitarith";

// TODO: Cleanup

const MAX_ROUNDS = 12;
const MID_ROUND = MAX_ROUNDS / 2;

const RC_WORDS = [
	0x00000000, 0x00000000,
	0x13198a2e, 0x03707344,
	0xa4093822, 0x299f31d0,
	0x082efa98, 0xec4e6c89,
	0x452821e6, 0x38d01377,
	0xbe5466cf, 0x34e90c6c,
	0x7ef84f78, 0xfd955cb1,
	0x85840851, 0xf1ac43aa,
	0xc882d32f, 0x25323c54,
	0x64a51195, 0xe0e3610d,
	0xd3b5a399, 0xca0c2399,
	0xc0ac29b7, 0xc97c50dd
];

const SBOX4 = [0xb, 0xf, 0x3, 0x2, 0xa, 0xc, 0x9, 0x1, 0x6, 0x7, 0x8, 0x0, 0xe, 0x5, 0xd, 0x4];

const M4 = [
	0x0, 0x2, 0x4, 0x8,
	0x1, 0x0, 0x4, 0x8,
	0x1, 0x2, 0x0, 0x8,
	0x1, 0x2, 0x4, 0x0
];

let RC, SBOX, ISBOX, M16, M16INV;

function precompute()
{
	if (RC)
	{
		return;
	}

	const rcCount = RC_WORDS.length / 2;
	RC = new Array(rcCount);
	for (let i = 0; i < rcCount; i++)
	{
		const rc = RC[i] = new Uint8Array(8);
		for (let j = 0; j < 4; j++)
		{
			rc[j] = RC_WORDS[i * 2] >>> (24 - 8 * j);
		}
		for (let j = 0; j < 4; j++)
		{
			rc[j + 4] = RC_WORDS[i * 2 + 1] >>> (24 - 8 * j);
		}
	}

	SBOX = new Uint8Array(256);
	ISBOX = new Uint8Array(256);
	for (let i = 0; i < SBOX4.length; i++)
	{
		for (let j = 0; j < SBOX4.length; j++)
		{
			const x = i * SBOX4.length + j;
			const s = (SBOX4[i] << 4) | SBOX4[j];
			SBOX[x] = s;
			ISBOX[s] = x;
		}
	}

	M16 = new Array(16);
	M16INV = new Array(16);
	for (let i = 0; i < 16; i++)
	{
		M16[i] =
			(M4[(i + 12) % 16] <<  8) |
			(M4[(i + 8) % 16] <<  4) |
			(M4[(i + 4) % 16]      ) |
			(M4[(i    ) % 16] << 12);
		M16INV[i] = ror16(M16[i], 12);
	}
}

function mulMatrix(v, matrix)
{
	let result = 0;
	for (let i = 0; i < 16; i++)
	{
		if (v & 1)
		{
			result ^= matrix[i];
		}
		v >>>= 1;
	}
	return result;
}

function Mprime(a)
{
	const chunk0 = mulMatrix((a[0] << 8) | a[1], M16);
	const chunk1 = mulMatrix((a[2] << 8) | a[3], M16INV);
	const chunk2 = mulMatrix((a[4] << 8) | a[5], M16INV);
	const chunk3 = mulMatrix((a[6] << 8) | a[7], M16);

	a[0] = chunk0 >> 8;
	a[1] = chunk0 & 0xff;
	a[2] = chunk1 >> 8;
	a[3] = chunk1 & 0xff;
	a[4] = chunk2 >> 8;
	a[5] = chunk2 & 0xff;
	a[6] = chunk3 >> 8;
	a[7] = chunk3 & 0xff;
}

// Similar to Rijndael ShiftRows, but uses nibbles for columns
// TODO: This method isn't exactly efficient OR readable
function shiftRows(a, inverse)
{
	const rows = new Array(4);
	for (let r = 0; r < 4; r++)
	{
		rows[r] = 0;
	}
	for (let b = 0; b < 8; b += 2)
	{
		for (let r = 0; r < 4; r++)
		{
			rows[r] <<= 4;
		}
		rows[0] |= a[b] >> 4;
		rows[1] |= a[b] & 0x0f;
		rows[2] |= a[b + 1] >> 4;
		rows[3] |= a[b + 1] & 0x0f;
	}

	for (let r = 0; r < 4; r++)
	{
		if (inverse)
		{
			rows[r] = ror16(rows[r], 4 * r);
		}
		else
		{
			rows[r] = rol16(rows[r], 4 * r);
		}
	}
	
	for (let b = 6; b >= 0; b -= 2)
	{
		a[b    ] = ((rows[0] & 0xf) << 4) | (rows[1] & 0xf);
		a[b + 1] = ((rows[2] & 0xf) << 4) | (rows[3] & 0xf);
		for (let r = 0; r < 4; r++)
		{
			rows[r] >>= 4;
		}
	}
}

function M(a)
{
	Mprime(a);
	shiftRows(a, false);
}

function invM(a)
{
	shiftRows(a, true);
	Mprime(a);
}

function S(a)
{
	for (let i = 0; i < 8; i++)
	{
		a[i] = SBOX[a[i]];
	}
}

function invS(a)
{
	for (let i = 0; i < 8; i++)
	{
		a[i] = ISBOX[a[i]];
	}
}

class PrinceTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("rounds", "Rounds", 12, { min: 2, max: 12, step: 2 });
	}

	transform(bytes, keyBytes)
	{
		precompute();

		this.checkBytesSize("Key", keyBytes, 128);
		
		const keys = this.generateKeys(keyBytes);
		
		return this.transformBlocks(bytes, 64, keys, this.options.rounds);
	}

	transformBlock(block, dest, destOffset, keys, rounds)
	{
		const skipRounds = (MAX_ROUNDS - rounds) / 2;
		const firstRound = skipRounds;
		const lastRound = MAX_ROUNDS - skipRounds - 1;

		const state = Uint8Array.from(block);
		const [k0, k1, k2] = keys;
		
		// Pre-whiten:
		xorBytes(state, k0);

		// Prince-Core, round 0:
		xorBytes(state, k1);
		xorBytes(state, RC[firstRound]);
		
		// Rounds 1 to mid
		for (let r = firstRound + 1; r < MID_ROUND; r++)
		{
			S(state);
			M(state);
			xorBytes(state, RC[r]);
			xorBytes(state, k1);
		}

		// Middle round
		S(state);
		Mprime(state);
		invS(state);

		// Rounds mid to n-1
		for (let r = MID_ROUND; r < lastRound; r++)
		{
			xorBytes(state, k1);
			xorBytes(state, RC[r]);
			invM(state);
			invS(state);
		}

		// Round n
		xorBytes(state, RC[lastRound]);
		xorBytes(state, k1);

		// Post-whiten:
		xorBytes(state, k2);
		dest.set(state, destOffset);
	}

	generateKeys(keyBytes)
	{
		const k0 = Uint8Array.from(keyBytes.subarray(0, 8));
		const k1 = Uint8Array.from(keyBytes.subarray(8, 16));
		const k2 = Uint8Array.from(k0);
		// k0 ROR 1
		rorBytes(k2, 1);
		// XOR k0 >> 63
		k2[7] ^= k0[0] >>> 7;

		return [k0, k1, k2];
	}
}

class PrinceEncryptTransform extends PrinceTransform
{
	constructor()
	{
		super(false);
	}
}

class PrinceDecryptTransform extends PrinceTransform
{
	constructor()
	{
		super(true);
	}

	generateKeys(keyBytes)
	{
		const keys = super.generateKeys(keyBytes);

		[keys[0], keys[2]] = [keys[2], keys[0]];
		xorBytes(keys[1], RC[11]);
		
		return keys;
	}
}

export {
	PrinceEncryptTransform,
	PrinceDecryptTransform
};
