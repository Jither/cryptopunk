import { TransformError } from "../transforms";
import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt16sBE, bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { rolBytes } from "../../cryptopunk.bitarith";

// TODO: UNFINISHED!
// Test vectors (examples from SAC_96_002.pdf):
// 1 round, key size 64
// 
// k: 0000 0000 0000 0000
// p: 0000 0000 0000 0000 0000 0000 0000 0000
// c: 6f06 02df 74b0 117f 8372 49e9 72c2 f0ce
//
// k: 0000 0000 0000 0000
// p: 0000 0000 0000 0000 0000 0000 1000 0000
// c: 759a d74e 7166 4ea2 9d9f 145a 7698 b79b
//
// k: 0000 0000 0001 0000
// p: 0000 0000 0000 0000 0000 0000 0000 0000
// c: b915 06a7 c751 6324 d905 4db1 2061 a315

const C = [
	0xa49ed284,	0x735203de,	0x43fe9ab1,	0xa61bd2f9,	0xa946e175,	0xfda506b3,	0xc71feb25,	0xe1f079bd,
	0xba96fde1,	0xf5837ac1,	0xb87d64e5,	0xc92f670b,	0xf1bc8ea3,	0x910ea8d7,	0x8b957d3f,	0xce53b9a3,
	0xecf76a59,	0x8b67fd95,	0xbea43971,	0xf261d93b
];

function rol128(x, rot)
{
	const xBytes = int32sToBytesBE(x);
	rolBytes(xBytes, rot);
	bytesToInt32sBE(xBytes, x);
}

function rol31l(x, rot)
{
	const fixed = x & 1;
	x = x & 0xfffffffe;
	return ((((x << rot) | (x >>> (31 - rot))) & 0xfffffffe) | fixed) >>> 0;
}

function rol31r(x, rot)
{
	const fixed = x & 0x80000000;
	x = x & 0x7fffffff;
	return ((((x << rot) | (x >>> (31 - rot))) & 0x7fffffff) | fixed) >>> 0;
}

class AkelarreBaseTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("rounds", "Rounds", 1, { min: 1 });
		throw new TransformError("Not implemented");
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, { min: 64, step: 64 });

		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 128, subKeys);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const rounds = this.options.rounds;
		const x = bytesToInt32sBE(block);

		let k = 0;
		x[0] += subKeys[k++];
		x[1] ^= subKeys[k++];
		x[2] ^= subKeys[k++];
		x[3] += subKeys[k++];
		
		for (let round = 0; round < rounds; round++)
		{
			const rot = subKeys[k++] & 0x7f;
			rol128(x, rot);
			
			let l = x[0] ^ x[2];
			let r = x[1] ^ x[3];
			
			r = rol31l(r, l & 0b11111);
			r += subKeys[k++];
			r = rol31r(r, (l >>> 5) & 0b11111);
			r += subKeys[k++];
			r = rol31l(r, (l >>> 10) & 0b11111);
			r += subKeys[k++];
			r = rol31r(r, (l >>> 15) & 0b11111);
			r += subKeys[k++];
			r = rol31l(r, (l >>> 20) & 0b01111);
			r += subKeys[k++];
			r = rol31r(r, (l >>> 24) & 0b01111);
			r += subKeys[k++];
			r = rol31l(r, (l >>> 28) & 0b01111);
			
			l = rol31l(l, r & 0b11111);
			l += subKeys[k++];
			l = rol31r(l, (r >>> 5) & 0b11111);
			l += subKeys[k++];
			l = rol31l(l, (r >>> 10) & 0b11111);
			l += subKeys[k++];
			l = rol31r(l, (r >>> 15) & 0b11111);
			l += subKeys[k++];
			l = rol31l(l, (r >>> 20) & 0b01111);
			l += subKeys[k++];
			l = rol31r(l, (r >>> 24) & 0b01111);
			l += subKeys[k++];
			l = rol31l(l, (r >>> 28) & 0b01111);

			x[0] ^= r;
			x[1] ^= l;
			x[2] ^= r;
			x[3] ^= l;
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
		const rounds = this.options.rounds;

		let t = bytesToInt16sBE(keyBytes);
		let nextT = bytesToInt16sBE(t.length);
		const keyWords = t.length;

		const keyCount = 9 + rounds * 13;
		const keys = new Uint32Array(keyCount);
		for (let i = 0; i < keyCount; i++)
		{
			const l = i % keyWords;
			const r = (i + 1) % keyWords;
			let kl = t[l];
			let kr = t[r];
			kl *= kl;
			kr *= kr;
			kl = (kl + C[0]) >>> 0;
			kr = (kr + C[1]) >>> 0;
			
			keys[i] =
				((kl <<  24) & 0xff000000) |
				((kl >>>  8) & 0x00ff0000) |
				((kr <<   8) & 0x0000ff00) |
				((kr >>> 24) & 0x000000ff);

			if (i % 2 === 0)
			{
				nextT[l] = (kl >>> 8) & 0xffff;
				nextT[r] = (kr >>> 8) & 0xffff;
			}

			if (r === 0)
			{
				[nextT, t] = [t, nextT];
			}
		}

		return keys;
	}

	/*
	generateSubKeys(keyBytes)
	{
		const t = bytesToInt32sBE(keyBytes);
		const keyWords = t.length;
		for (let i = 0; i < keyWords; i++)
		{
			t[i] = add(t[i], C[i]);
			t[i] = modSquare(t[i], P[i]);
		}
		
		const keys = new Uint32Array(SUBKEYS);
		for (let i = 0; i < SUBKEYS; i++)
		{
			const i0 = i % keyWords,
				i1 = (i + 1) % keyWords,
				i2 = (i + 2) % keyWords,
				i3 = (i + 3) % keyWords;

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
	*/
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
		const rounds = this.options.rounds;
		const encKeys = super.generateSubKeys(keyBytes);
		const keys = new Uint32Array(encKeys.length);
		const temp = [];
		let ek = 0;
		let dk = keys.length - 1;

		let t1 = -encKeys[ek++];
		let t2 = encKeys[ek++];
		let t3 = encKeys[ek++];
		let t4 = -encKeys[ek++];

		keys[dk--] = t4;
		keys[dk--] = t3;
		keys[dk--] = t2;
		keys[dk--] = t1;

		keys[dk--] = 128 - (encKeys[ek++] & 0x7f);

		for (let r = 0; r < rounds; r++)
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