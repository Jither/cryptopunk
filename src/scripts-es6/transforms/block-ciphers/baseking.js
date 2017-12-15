import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt16sBE, int16sToBytesBE } from "../../cryptopunk.utils";
import { rol16 } from "../../cryptopunk.bitarith";

const ROUNDS = 11;

const PI1 = [0, 8, 1, 15, 5, 10, 7, 6, 13, 14, 2, 3];
const PI2 = [13, 14, 2, 3, 10, 9, 6, 11, 1, 15, 8, 0];
const THETA_OFFSETS = [2, 6, 7, 9, 10, 11];
const USE_CONSTANT = [0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0];

let RC_ENC, RC_DEC;

function precomputeRoundConstants(constant)
{
	const result = new Array(ROUNDS + 1);
	for (let i = 0; i <= ROUNDS; i++)
	{
		result[i] = constant;
		constant <<= 1;
		if (constant & 0x100)
		{
			constant ^= 0x111;
		}
	}

	return result;
}

function precompute()
{
	if (RC_ENC)
	{
		return;
	}

	RC_ENC = precomputeRoundConstants(0x0b);
	RC_DEC = RC_ENC.concat();
	RC_DEC.reverse();
}

// µ16 - invert word order
function mu(a)
{
	a.reverse();
}

// Non-linear transformation γ
function gamma(a)
{
	const n = a.length;
	const b = a.concat();
	for (let i = 0; i < n; i++)
	{
		// a0 = a0 ^ (a1 | ~ a2)
		a[i] ^= b[(i + 4) % n] | (~(b[(i + 8) % n]));
	}
}

// Linear transformation θ
function theta(a)
{
	const n = a.length;
	const b = a.concat();
	for (let j = 0; j < THETA_OFFSETS.length; j++)
	{
		const offset = THETA_OFFSETS[j];
		for (let i = 0; i < n; i++)
		{
			a[i] ^= b[(i + offset) % n];
		}
	}
}

// Bit permutation π1: [0, 8, 1, 15, 5, 10, 7, 6, 13, 14, 2, 3]
function pi1(a)
{
	for (let i = 0; i < a.length; i++)
	{
		a[i] = rol16(a[i], PI1[i]);
	}
}

// Bit permutation π2: [13, 14, 2, 3, 10, 9, 6, 11, 1, 15, 8, 0]
function pi2(a)
{
	for (let i = 0; i < a.length; i++)
	{
		a[i] = rol16(a[i], PI2[i]);
	}
}

function addKey(a, keys, roundConstants, round)
{
	for (let i = 0; i < a.length; i++)
	{
		a[i] ^= keys[i];
		if (USE_CONSTANT[i])
		{
			a[i] ^= roundConstants[round];
		}
	}
}

function rho(a)
{
	theta(a);
	pi1(a);
	gamma(a);
	pi2(a);
}

class BaseKingTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		precompute();

		this.checkBytesSize("Key", keyBytes, 192);

		const keys = this.generateKeys(keyBytes);

		return this.transformBlocks(bytes, 192, keys, this.decrypt ? RC_DEC : RC_ENC);
	}

	generateKeys(keyBytes)
	{
		return bytesToInt16sBE(keyBytes);
	}

	transformBlock(block, dest, destOffset, keys, roundConstants)
	{
		const a = bytesToInt16sBE(block);
		for (let i = 0; i < ROUNDS; i++)
		{
			addKey(a, keys, roundConstants, i);
			rho(a);
		}
		addKey(a, keys, roundConstants, ROUNDS);
		
		theta(a);
		mu(a);

		dest.set(int16sToBytesBE(a), destOffset);
	}
}

class BaseKingEncryptTransform extends BaseKingTransform
{
	constructor()
	{
		super(false);
	}
}

class BaseKingDecryptTransform extends BaseKingTransform
{
	constructor()
	{
		super(true);
	}

	generateKeys(keyBytes)
	{
		const keys = super.generateKeys(keyBytes);
		theta(keys);
		mu(keys);
		return keys;
	}
}

export {
	BaseKingEncryptTransform,
	BaseKingDecryptTransform
};