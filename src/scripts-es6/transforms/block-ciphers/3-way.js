import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { mirror, ror, rol } from "../../cryptopunk.bitarith";

const ROUNDS = 11;

let RC_ENC, RC_DEC;

function precomputeRoundConstants(constant)
{
	const result = new Array(ROUNDS + 1);
	for (let i = 0; i <= ROUNDS; i++)
	{
		result[i] = constant;
		constant <<= 1;
		if (constant & 0x10000)
		{
			constant ^= 0x11011;
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

	RC_ENC = precomputeRoundConstants(0x0b0b);
	RC_DEC = precomputeRoundConstants(0xb1b1);
}

// µ1 - invert bit order
function mu(a)
{
	const a0 = a[0];
	a[0] = mirror(a[2], 32);
	a[1] = mirror(a[1], 32);
	a[2] = mirror( a0, 32);
}

// Non-linear transformation γ
// This is equivalent to a 3x3 S-box with input and output being 3 bits taken from the same position in a, a+1 and a+2
// The S-box would then be:
// 000 => 111
// 001 => 010
// 010 => 100
// 100 => 001
// 110 => 011
// 101 => 110
// 011 => 101
// 111 => 000
function gamma(a)
{
	const [a0, a1, a2] = a;
	a[0] ^= (a1 | (~a2));
	a[1] ^= (a2 | (~a0));
	a[2] ^= (a0 | (~a1));
}

// Linear transformation θ
function theta(a)
{
	const [a0, a1, a2] = a;
	a[0] ^= (a0 >>> 16) ^ (a1 << 16) ^ (a1 >>> 16) ^ (a2 << 16) ^
			(a1 >>> 24) ^ (a2 <<  8) ^ (a2 >>>  8) ^ (a0 << 24) ^
			(a2 >>> 16) ^ (a0 << 16) ^ (a2 >>> 24) ^ (a0 <<  8);

	a[1] ^= (a1 >>> 16) ^ (a2 << 16) ^ (a2 >>> 16) ^ (a0 << 16) ^
			(a2 >>> 24) ^ (a0 <<  8) ^ (a0 >>>  8) ^ (a1 << 24) ^
			(a0 >>> 16) ^ (a1 << 16) ^ (a0 >>> 24) ^ (a1 <<  8);

	a[2] ^= (a2 >>> 16) ^ (a0 << 16) ^ (a0 >>> 16) ^ (a1 << 16) ^
			(a0 >>> 24) ^ (a1 <<  8) ^ (a1 >>>  8) ^ (a2 << 24) ^
			(a1 >>> 16) ^ (a2 << 16) ^ (a1 >>> 24) ^ (a2 <<  8);
}

// Bit permutation π1: [10, 0, -1]
function pi1(a)
{
	a[0] = ror(a[0], 10);
	a[2] = rol(a[2],  1);
}

// Bit permutation π2: [-1, 0, 10]
function pi2(a)
{
	a[0] = rol(a[0],  1);
	a[2] = ror(a[2], 10);
}

function rho(a)
{
	theta(a);
	pi1(a);
	gamma(a);
	pi2(a);
}

function addKey(a, keys, roundConstants, i)
{
	a[0] ^= keys[0] ^ (roundConstants[i] << 16);
	a[1] ^= keys[1];
	a[2] ^= keys[2] ^ roundConstants[i];
}

class ThreeWayTransform extends BlockCipherTransform
{
	get description()
	{
		return "Designed in 1994 by Joan Daemen. It is closely related to BaseKing: The two are variants of the same general cipher technique.";
	}

	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		precompute();

		this.checkBytesSize("Key", keyBytes, 96);

		const keys = this.generateKeys(keyBytes);

		return this.transformBlocks(bytes, 96, keys, this.decrypt ? RC_DEC : RC_ENC);
	}

	generateKeys(keyBytes)
	{
		return bytesToInt32sBE(keyBytes);		
	}

	doRounds(a, keys, roundConstants)
	{
		for (let i = 0; i < ROUNDS; i++)
		{
			addKey(a, keys, roundConstants, i);
			
			rho(a);
		}
		addKey(a, keys, roundConstants, ROUNDS);
		
		theta(a);
	}
}

class ThreeWayEncryptTransform extends ThreeWayTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, keys, roundConstants)
	{
		const a = bytesToInt32sBE(block);

		this.doRounds(a, keys, roundConstants);

		dest.set(int32sToBytesBE(a), destOffset);
	}
}

class ThreeWayDecryptTransform extends ThreeWayTransform
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

	transformBlock(block, dest, destOffset, keys, roundConstants)
	{
		const a = bytesToInt32sBE(block);

		mu(a);

		this.doRounds(a, keys, roundConstants);

		mu(a);

		dest.set(int32sToBytesBE(a), destOffset);
	}
}

export {
	ThreeWayEncryptTransform,
	ThreeWayDecryptTransform
};