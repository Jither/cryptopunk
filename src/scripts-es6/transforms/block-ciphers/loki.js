import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { ror, rol } from "../../cryptopunk.bitarith";

const VARIANT_VALUES = [
	"loki89",
	"loki91"
];

const VARIANT_NAMES = [
	"LOKI89",
	"LOKI91"
];

const ROUNDS = 8;
const MSB = 0x80000000;

const P = [
	31, 23, 15, 7, 30, 22, 14, 6,
	29, 21, 13, 5, 28, 20, 12, 4,
	27, 19, 11, 3, 26, 18, 10, 2,
	25, 17, 9, 1, 24, 16, 8, 0
];

const SFN_GEN = [375, 379, 391, 395, 397, 415, 419, 425, 433, 445, 451, 463, 471, 477, 487, 499, 0];
const SFN_EXP = [ 31,  31,  31,  31,  31,  31,  31,  31,  31,  31,  31,  31,  31,  31,  31,  31, 0];

function mul8(a, b, gen)
{
	let product = 0;

	while (b !== 0)
	{
		if (b & 0x1)
		{
			product ^= a;
		}
		a <<= 1;
		if (a >= 256)
		{
			a ^= gen;
		}

		b >>= 1;
	}

	return product;
}

function exp8(base, exponent, gen)
{
	let accum = base;
	let result = 1;

	if (base === 0)
	{
		return 0;
	}

	while (exponent !== 0)
	{
		if (exponent & 0x1)
		{
			result = mul8(result, accum, gen);
		}
		exponent >>>= 1;
		accum = mul8(accum, accum, gen);
	}
	return result;
}

function perm32(input, perm)
{
	let mask = MSB;

	let p = 0;
	let output = 0;
	for (let o = 0; o < 32; o++)
	{
		const i = perm[p++];
		const b = (input >>> i) & 0x01;
		if (b)
		{
			output |= mask;
		}
		mask >>>= 1;
	}
	return output;
}

class LokiTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("variant", "Variant", "loki89", { type: "select", values: VARIANT_VALUES, texts: VARIANT_NAMES });
	}

	S(i)
	{
		const row = ((i >>> 8) & 0x0c) | (i & 0x03);
		const col = (i >>> 2) & 0xff;
		const t = this.options.variant === "loki91" ? (col + ((row * 17) ^ 0xff)) & 0xff : col ^ row;
		return exp8(t, SFN_EXP[row], SFN_GEN[row]);
	}
	
	F(r, k)
	{
		const a = r ^ k;
		const b =
			(this.S( a         & 0xfff)      ) |
			(this.S((a >>>  8) & 0xfff) <<  8) |
			(this.S((a >>> 16) & 0xfff) << 16) |
			(this.S((((a >>> 24) | (a << 8)) & 0xfff)) << 24);
	
		return perm32(b, P);
	}
	
	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, 64);

		const subKeys = this.generateKeys(keyBytes);

		return this.transformBlocks(bytes, 64, subKeys);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const p = bytesToInt32sBE(block);
		
		let k = 0;
		let l = p[0] ^ subKeys[k++];
		let r = p[1] ^ subKeys[k++];

		for (let i = 0; i < ROUNDS; i++)
		{
			l ^= this.F(r, subKeys[k++]);
			r ^= this.F(l, subKeys[k++]);
		}

		l ^= subKeys[k++];
		r ^= subKeys[k++];
		
		const c = int32sToBytesBE([r, l]);
		dest.set(c, destOffset);
	}

	generateKeys(keyBytes)
	{
		const key = bytesToInt32sBE(keyBytes);
		let kl = key[0];
		let kr = key[1];

		const keyCount = ROUNDS * 2 + 4;
		const result = new Uint32Array(keyCount);

		switch (this.options.variant)
		{
			case "loki89":
				result[0] = kl;
				result[1] = kr;
				for (let i = 2; i < keyCount; i += 2)
				{
					result[i] = kl;
					result[i + 1] = kr;
					kl = rol(kl, 12);
					kr = rol(kr, 12);
				}
				break;
			case "loki91":
			 	// No pre-whitening in LOKI91
				result[0] = 0;
				result[1] = 0;
				for (let i = 2; i < keyCount - 2; i += 4)
				{
					result[i] = kl;
					kl = rol(kl, 12);
					result[i + 1] = kl;
					kl = rol(kl, 13);
					result[i + 2] = kr;
					kr = rol(kr, 12);
					result[i + 3] = kr;
					kr = rol(kr, 13);
				}
				// No post-whitening in LOKI91
				result[keyCount - 2] = 0;
				result[keyCount - 1] = 0;
				break;
		}

		if (this.decrypt)
		{
			result.reverse();
		}

		return result;
	}
}

class LokiEncryptTransform extends LokiTransform
{
	constructor()
	{
		super(false);
	}
}

class LokiDecryptTransform extends LokiTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	LokiEncryptTransform,
	LokiDecryptTransform
};