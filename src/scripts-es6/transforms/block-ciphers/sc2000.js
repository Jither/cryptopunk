import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { rol } from "../../cryptopunk.bitarith";

const MASKS = [0x55555555, 0x33333333];

const M_BOX = [
	0xd0c19225, 0xa5a2240a, 0x1b84d250, 0xb728a4a1,
	0x6a704902, 0x85dddbe6, 0x766ff4a4, 0xecdfe128,
	0xafd13e94, 0xdf837d09, 0xbb27fa52, 0x695059ac,
	0x52a1bb58, 0xcc322f1d, 0x1844565b, 0xb4a8acf6,
	0x34235438, 0x6847a851, 0xe48c0cbb, 0xcd181136,
	0x9a112a0c, 0x43ec6d0e, 0x87d8d27d, 0x487dc995,
	0x90fb9b4b, 0xa1f63697, 0xfc513ed9, 0x78a37d93,
	0x8d16c5df, 0x9e0c8bbe, 0x3c381f7c, 0xe9fb0779
];

const SBOX_4 = [
	0x2, 0x5, 0xa, 0xc, 0x7, 0xf, 0x1, 0xb,
	0xd, 0x6, 0x0, 0x9, 0x4, 0x8, 0x3, 0xe
];

const ISBOX_4 = [
	0xa, 0x6, 0x0, 0xe, 0xc, 0x1, 0x9, 0x4,
	0xd, 0xb, 0x2, 0x7, 0x3, 0x8, 0xf, 0x5
];

const SBOX_5 = [
	0x14, 0x1a, 0x07, 0x1f, 0x13, 0x0c, 0x0a, 0x0f,
	0x16, 0x1e, 0x0d, 0x0e, 0x04, 0x18, 0x09, 0x12,
	0x1b, 0x0b, 0x01, 0x15, 0x06, 0x10, 0x02, 0x1c,
	0x17, 0x05, 0x08, 0x03, 0x00, 0x11, 0x1d, 0x19
];

const SBOX_6 = [
	0x2f, 0x3b, 0x19, 0x2a, 0x0f, 0x17, 0x1c, 0x27,
	0x1a, 0x26, 0x24, 0x13, 0x3c, 0x18, 0x1d, 0x38,
	0x25, 0x3f, 0x14, 0x3d, 0x37, 0x02, 0x1e, 0x2c,
	0x09, 0x0a, 0x06, 0x16, 0x35, 0x30, 0x33, 0x0b,
	0x3e, 0x34, 0x23, 0x12, 0x0e, 0x2e, 0x00, 0x36,
	0x11, 0x28, 0x1b, 0x04, 0x1f, 0x08, 0x05, 0x0c,
	0x03, 0x10, 0x29, 0x22, 0x21, 0x07, 0x2d, 0x31,
	0x32, 0x3a, 0x01, 0x15, 0x2b, 0x39, 0x20, 0x0d
];

const IK_ORDER = [
	[0, 1, 2, 3],
	[1, 0, 3, 2],
	[2, 3, 0, 1],
	[3, 2, 1, 0],
	[0, 2, 3, 1],
	[1, 3, 2, 0],
	[2, 0, 1, 3],
	[3, 1, 0, 2],
	[0, 3, 1, 2],
	[1, 2, 0, 3],
	[2, 1, 3, 0],
	[3, 0, 2, 1]
];

const IK_INDEX = [
	[0, 0, 0, 0],
	[1, 1, 1, 1],
	[2, 2, 2, 2],
	[0, 1, 0, 1],
	[1, 2, 1, 2],
	[2, 0, 2, 0],
	[0, 2, 0, 2],
	[1, 0, 1, 0],
	[2, 1, 2, 1]
];

function S(a)
{
	const
		q = SBOX_6[(a >>> 26) & 0x3f],
		r = SBOX_5[(a >>> 21) & 0x1f],
		s = SBOX_5[(a >>> 16) & 0x1f],
		t = SBOX_5[(a >>> 11) & 0x1f],
		u = SBOX_5[(a >>>  6) & 0x1f],
		v = SBOX_6[ a         & 0x3f];
	
	return ((q << 26) | (r << 21) | (s << 16) | (t << 11) | (u << 6) | v) >>> 0;
}

function M(a)
{
	let result = 0;
	for (let i = 31; i >= 0; i--)
	{
		if (a & 1)
		{
			result ^= M_BOX[i];
		}
		a >>>= 1;
	}
	return result >>> 0;
}

function L(a, b, mask)
{
	const imask = mask ^ 0xffffffff;
	const s = a & mask;
	const t = b & imask;
	return [s ^ b, t ^ a];
}

function F(a, b, mask)
{
	let s = S(a);
	s = M(s);
	let t = S(b);
	t = M(t);
	return L(s, t, mask);
}

function RR(state, mask)
{
	const [s, t] = F(state[2], state[3], mask);
	state[0] ^= s;
	state[1] ^= t;
}

function RL(state, mask)
{
	const a = state[0];
	const b = state[1];
	const [s, t] = F(a, b, mask);
	state[0] = state[2] ^ s;
	state[1] = state[3] ^ t;
	state[2] = a;
	state[3] = b;
}

function I(state, key)
{
	state[0] ^= key[0];
	state[1] ^= key[1];
	state[2] ^= key[2];
	state[3] ^= key[3];
}

function B(state, sbox)
{
	let mask = 1;
	const result = [0, 0, 0, 0];

	for (let i = 0; i < 32; i++)
	{
		let s = 0;
		for (let bit = 0; bit < 4; bit++)
		{
			if (state[bit] & mask)
			{
				s |= 0b1000 >> bit;
			}
		}

		const t = sbox[s];
		for (let bit = 0; bit < 4; bit++)
		{
			if (t & 0b1000 >> bit)
			{
				result[bit] |= mask;
			}
		}

		mask <<= 1;
	}
	state[0] = result[0];
	state[1] = result[1];
	state[2] = result[2];
	state[3] = result[3];
}

class Sc2000Transform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		const keySize = this.checkBytesSize("Key", keyBytes, [128, 192, 256]);

		const rounds = keySize === 128 ? 7 : 8;
		const keys = this.generateKeys(keyBytes, rounds);

		return this.transformBlocks(bytes, 128, keys, rounds);
	}

	generateKeys(keyBytes, rounds)
	{
		const uk = new Array(8);
		bytesToInt32sBE(keyBytes, uk);

		switch (keyBytes.length)
		{
			case 16:
				uk[4] = uk[0];
				uk[5] = uk[1];
				uk[6] = uk[2];
				uk[7] = uk[3];
				break;
			case 24:
				uk[6] = uk[0];
				uk[7] = uk[1];
				break;
			case 32:
				break;
			// no default
		}

		const ik = this.makeIntermediateKeys(uk);
		return this.makeExpandedKeys(ik, rounds);
	}

	makeIntermediateKeys(uk)
	{
		const result = new Array(12);
		for (let i = 0; i < 3; i++)
		{
			result[i    ] = this.makeIntermediateKey(uk[0], uk[1], i, 0);
			result[i + 3] = this.makeIntermediateKey(uk[2], uk[3], i, 1);
			result[i + 6] = this.makeIntermediateKey(uk[4], uk[5], i, 2);
			result[i + 9] = this.makeIntermediateKey(uk[6], uk[7], i, 3);
		}
		return result;
	}

	makeIntermediateKey(k1, k2, i, j)
	{
		let ka = k1;
		ka = S(ka);
		ka = M(ka);
		let kb = k2;
		kb = S(kb);
		kb = M(kb);

		let m = 4 * i + j;
		m = S(m);
		m = M(m);

		ka += m;
		ka &= 0xffffffff;
		kb *= i + 1;
		kb &= 0xffffffff;

		ka ^= kb;
		ka = S(ka);
		ka = M(ka);
		return ka;
	}

	makeExpandedKeys(ik, rounds)
	{
		// Two key sets per round
		const count = rounds * 2;
		const result = new Array(count);
		let n = 0;
		for (let r = 0; r < count; r++)
		{
			// Four keys per key set
			const rk = result[r] = new Array(4);
			for (let i = 0; i < 4; i++)
			{
				const t = (n + Math.floor(n / 36)) % 12;
				const s = n % 9;
				rk[i] = this.makeExpandedKey(ik, t, s);

				n++;
			}
		}
		return result;
	}

	makeExpandedKey(ik, t, s)
	{
		let   x = ik[IK_ORDER[t][0] * 3 + IK_INDEX[s][0]];
		const y = ik[IK_ORDER[t][1] * 3 + IK_INDEX[s][1]];
		let   z = ik[IK_ORDER[t][2] * 3 + IK_INDEX[s][2]];
		const w = ik[IK_ORDER[t][3] * 3 + IK_INDEX[s][3]];
		
		x = rol(x, 1);
		x += y;
		x &= 0xffffffff;

		z = rol(z, 1);
		z -= w;
		z &= 0xffffffff;
		z = rol(z, 1);

		x ^= z;
		return x;
	}

	transformBlock(block, dest, destOffset, keys, rounds)
	{
		const state = bytesToInt32sBE(block);

		// Mask always starts from index 0 when encrypting.
		// Decryption requires reverse order of encryption,
		// which means the number of rounds determines the first mask
		let m = this.decrypt ? (rounds % 2) : 0;

		let k = 0;
		for (let i = 0; i < rounds - 1; i++)
		{
			const mask = MASKS[m % 2];

			I(state, keys[k++]);
			B(state, this.sbox4);
			I(state, keys[k++]);
			RR(state, mask);
			RL(state, mask);

			m++;
		}

		I(state, keys[k++]);
		B(state, this.sbox4);
		I(state, keys[k++]);

		dest.set(int32sToBytesBE(state), destOffset);
	}
}

class Sc2000EncryptTransform extends Sc2000Transform
{
	constructor()
	{
		super(false);
		this.sbox4 = SBOX_4;
	}
}

class Sc2000DecryptTransform extends Sc2000Transform
{
	constructor()
	{
		super(true);
		this.sbox4 = ISBOX_4;
	}

	generateKeys(keyBytes, rounds)
	{
		const keys = super.generateKeys(keyBytes, rounds);

		keys.reverse();

		return keys;
	}
}

export {
	Sc2000EncryptTransform,
	Sc2000DecryptTransform
};