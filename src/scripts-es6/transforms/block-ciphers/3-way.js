import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { mirror } from "../../cryptopunk.bitarith";

const ROUNDS = 11;

function mu(a)
{
	const a0 = a[0];
	a[0] = mirror(a[2], 32);
	a[1] = mirror(a[1], 32);
	a[2] = mirror( a0, 32);
}

function gamma(a)
{
	const [a0, a1, a2] = a;
	a[0] ^= (a1 | (~a2));
	a[1] ^= (a2 | (~a0));
	a[2] ^= (a0 | (~a1));
}

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

function pi1(a)
{
	a[0] = (a[0] >>> 10) ^ (a[0] <<  22);
	a[2] = (a[2] <<   1) ^ (a[2] >>> 31);
}

function pi2(a)
{
	a[0] = (a[0] <<   1) ^ (a[0] >>> 31);
	a[2] = (a[2] >>> 10) ^ (a[2] <<  22);
}

function rho(a)
{
	theta(a);
	pi1(a);
	gamma(a);
	pi2(a);
}

class ThreeWayTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	generateRoundConstants()
	{
		let constant = this.getStartConstant();
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

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, 96);

		const roundConstants = this.generateRoundConstants();
		const keys = this.generateKeys(keyBytes);

		return this.transformBlocks(bytes, 96, keys, roundConstants);
	}

	doRounds(a, keys, roundConstants)
	{
		for (let i = 0; i < ROUNDS; i++)
		{
			a[0] ^= keys[0] ^ (roundConstants[i] << 16);
			a[1] ^= keys[1];
			a[2] ^= keys[2] ^ roundConstants[i];
			
			rho(a);
		}
		a[0] ^= keys[0] ^ (roundConstants[ROUNDS] << 16);
		a[1] ^= keys[1];
		a[2] ^= keys[2] ^ roundConstants[ROUNDS];
		
		theta(a);
	}
}

class ThreeWayEncryptTransform extends ThreeWayTransform
{
	constructor()
	{
		super(false);
	}

	getStartConstant()
	{
		return 0x0b0b;
	}

	generateKeys(keyBytes)
	{
		return bytesToInt32sBE(keyBytes);		
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

	getStartConstant()
	{
		return 0xb1b1;
	}

	generateKeys(keyBytes)
	{
		const keys = bytesToInt32sBE(keyBytes);
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