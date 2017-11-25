import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE, int32sToHex } from "../../cryptopunk.utils";
import { add } from "../../cryptopunk.bitarith";
import { modSquare } from "../../cryptopunk.math";

const C = [
	0xa49ed284,	0x735203de,	0x43fe9ab1,	0xa61bd2f9,	0xa946e175,	0xfda506b3,	0xc71feb25,	0xe1f079bd,
	0xba96fde1,	0xf5837ac1,	0xb87d64e5,	0xc92f670b,	0xf1bc8ea3,	0x910ea8d7,	0x8b957d3f,	0xce53b9a3,
	0xecf76a59,	0x8b67fd95,	0xbea43971,	0xf261d93b
];

const P = [
	0xfff1d567,	0xfff208c7,	0xffffd487,	0xfff75587,	0xfff8c7d7,	0xfff8f207,	0xfff90767,	0xfffc59e7,
	0xfffb1d07,	0xfffdb3a7,	0xfffa6157,	0xfffea977,	0xfffd78c7,	0xfffc0fd7,	0xfffeffb7,	0xffffd487,
	0xfff923b7,	0xfffb40a7,	0xfffce867,	0xfff9b6b7
];

const SHIFTS_0 = [5, 15, 24];
const SHIFT_MASKS_0 = [0x1f, 0x1f, 0xf];
const SHIFTS_1 = [10, 20, 28];
const SHIFT_MASKS_1 = [0x1f, 0xf, 0xf];

const ROUNDS = 1;
const KEY_WORDS = 4;
const SUBKEYS = (13 * ROUNDS + 9);

// Akelarre's rol 128 is... different. Akelarre treats everything as big endian,
// but the order of dwords is reversed when rotating.
// E.g. a rotation 72 bits (9 bytes) to the left will result in this:
// aaaaaaaa bbbbbbbb cccccccc dddddddd
// 76543210 76543210 76543210 76543210
// =
// ccccccbb ddddddcc aaaaaadd bbbbbbaa (Akelarre)
// 54321076 54321076 54321076 54321076
//
// ccccccdd ddddddaa aaaaaabb bbbbbbcc (normal 9 byte shift)
// 54321076 54321076 54321076 54321076

function rol128(x, rot)
{
	if (rot < 32) {
		const temp = x[3];
		for (let i = 3; i > 0; i--)
		{
			x[i] <<= rot;
			if (rot !== 0)
			{
				x[i] |= x[i - 1] >>> (32 - rot); 
			}
		}
		x[0] <<= rot;
		if (rot !== 0)
		{
			x[0] |= temp >>> (32 - rot);
		}
	}
	else if (rot < 64)
	{
		const temp1 = x[3];
		const temp2 = x[2];

		for (let i = 3; i > 1; i--)
		{
			x[i] = 0;
			x[i] = x[i - 1] << (rot - 32);
			if (rot !== 32)
			{
				x[i] |= x[i - 2] >>> (64 - rot);
			}
		}
		x[1] = 0;
		x[1] = x[0] << (rot - 32);
		if (rot !== 32)
		{
			x[1] |= temp1 >>> (64 - rot);
		}
		x[0] = 0;
		x[0] = temp1 << (rot - 32);
		if (rot !== 32)
		{
			x[0] |= temp2 >>> (64 - rot);
		}
	}
	else if (rot < 96)
	{
		const temp1 = x[0];
		const temp2 = x[1];

		rot = 128 - rot;
		for (let i = 0; i < 2; i++ )
		{
			x[i] = 0;
			if (rot !== 64)
			{
				x[i] = x[i + 1] >>> (rot - 32);
			}
			x[i] |= x[i + 2] << (64 - rot);
		}
		x[2] = 0;
		if (rot !== 64)
		{
			x[2] = x[3] >>> (rot - 32);
		}
		x[2] |= temp1 << (64 - rot);
		x[3] = 0;
		if (rot !== 64)
		{
			x[3] = temp1 >>> (rot - 32);
		}
		x[3] |= temp2 << (64 - rot);
	}
	else
	{
		const temp = x[0];
		
		rot = 128 - rot;
		for (let i = 0; i < 3; i++)
		{
			if (rot !== 32)
			{
				x[i] >>>= rot;
			}
			else
			{
				x[i] = 0;
			}
			x[i] |= x[i + 1] << (32 - rot);
		}
		if (rot !== 32)
		{
			x[3] >>>= rot;
		}
		else 
		{
			x[3] = 0;
		}
		x[3] |= temp << (32 - rot);
	}
}

function rol31(x, rot)
{
	const bit = x & 1;
	x = x & 0xfffffffe;
	return ((x << rot) | (x >>> (31 - rot))) | bit;
}


function rol1(x, rot)
{
	const bit = x & 0x80000000;
	x = x & 0x7fffffff;
	return ((x << rot) | (x >>> (31 - rot))) | bit;
}

class AkelarreBaseTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, 128);

		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 128, subKeys);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const x = bytesToInt32sBE(block);

		let k = 0;
		x[0] += subKeys[k++];
		x[1] ^= subKeys[k++];
		x[2] ^= subKeys[k++];
		x[3] += subKeys[k++];
		
		let r = 0;
		while (r < ROUNDS)
		{
			rol128(x, subKeys[k++] & 0x7f);
			
			let t1 = x[0] ^ x[2];
			let t2 = x[1] ^ x[3];
			
			t2 = rol31(t2, t1);
			for (let i = 0; i < 3; i++)
			{
				t2 += subKeys[k++];
				t2 = rol1(t2, (t1 >>> SHIFTS_0[i]) & SHIFT_MASKS_0[i]);
				t2 += subKeys[k++];
				t2 = rol31(t2, (t1 >>> SHIFTS_1[i]) & SHIFT_MASKS_1[i]);
			}

			t1 = rol1(t1, t2);
			for (let i = 0; i < 3; i++)
			{
				t1 += subKeys[k++];
				t1 = rol31(t1, (t2 >>> SHIFTS_0[i]) & SHIFT_MASKS_0[i]);
				t1 += subKeys[k++];
				t1 = rol1(t1, (t2 >>> SHIFTS_1[i]) & SHIFT_MASKS_1[i]);
			}

			x[0] ^= t2;
			x[1] ^= t1;
			x[2] ^= t2;
			x[3] ^= t1;
			
			r++;
		}

		rol128(x, subKeys[k++] & 0x7f);
		x[0] += subKeys[k++];
		x[1] ^= subKeys[k++];
		x[2] ^= subKeys[k++];
		x[3] += subKeys[k++];
		
		dest.set(int32sToBytesBE(x), destOffset);
	}

	generateSubKeys(keyBytes)
	{
		const t = bytesToInt32sBE(keyBytes);
		for (let i = 0; i < KEY_WORDS; i++)
		{
			t[i] = add(t[i], C[i]);
			t[i] = modSquare(t[i], P[i]);
		}
		
		const keys = new Uint32Array(SUBKEYS);
		for (let i = 0; i < SUBKEYS; i++)
		{
			const i0 = i % KEY_WORDS,
				i1 = (i + 1) % KEY_WORDS,
				i2 = (i + 2) % KEY_WORDS,
				i3 = (i + 3) % KEY_WORDS;

			const t0 = t[i0];
			const t1 = t[i1];
			const t2 = t[i2];
			const t3 = t[i3];
			keys[i] = t0 ^ t2;
			t[i0] = modSquare(t0 ^ t1, P[i0]);
			t[i2] = modSquare(t2 ^ t3, P[i2]);
		}

		return keys;
	}
}

class AkelarreEncryptTransform extends AkelarreBaseTransform
{
	constructor()
	{
		super(false);
	}
}

class AkelarreDecryptTransform extends AkelarreBaseTransform
{
	constructor()
	{
		super(true);
	}

	generateSubKeys(keyBytes)
	{
		const encKeys = super.generateSubKeys(keyBytes);
		const keys = new Uint32Array(SUBKEYS);
		const temp = [];
		let ek = 0;
		let dk = SUBKEYS - 1;

		let t1 = -encKeys[ek++];
		let t2 = encKeys[ek++];
		let t3 = encKeys[ek++];
		let t4 = -encKeys[ek++];

		keys[dk--] = t4;
		keys[dk--] = t3;
		keys[dk--] = t2;
		keys[dk--] = t1;

		keys[dk--] = 128 - (encKeys[ek++] & 0x7f);

		for (let r = 0; r < ROUNDS; r++)
		{
			for (let i = 0; i < 11; i++)
			{
				temp[i] = encKeys[ek++];
			}
			keys[dk--] = encKeys[ek++];
			for (let i = 10; i >= 0; i--)
			{
				keys[dk--] = temp[i];
			}
			keys[dk--] = 128 - (encKeys[ek++] & 0x7f);
		}

		t1 = -encKeys[ek++];
		t2 = encKeys[ek++];
		t3 = encKeys[ek++];
		t4 = -encKeys[ek++];

		keys[dk--] = t4;
		keys[dk--] = t3;
		keys[dk--] = t2;
		keys[dk--] = t1;

		return keys;
	}
}

export {
	AkelarreEncryptTransform,
	AkelarreDecryptTransform
};