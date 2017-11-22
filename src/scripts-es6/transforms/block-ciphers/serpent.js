import { BlockCipherTransform } from "./block-cipher";
import { int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";
import { rol, ror } from "../../cryptopunk.bitarith";

// Fractional part of (SQRT(5) + 1)/2
const GOLDEN_RATIO = 0x9e3779b9;
const ROUNDS = 32;

const VARIANT_VALUES = [
	"serpent",
	"tnepres",
	"serpent-0"
];

const VARIANT_NAMES = [
	"Serpent",
	"tnepreS",
	"Serpent-0"
];

// The sboxX methods are an algorithmic optimization of DES-like S-boxes for nibble substitution.
// Those, in turn are derived from the original DES S-boxes and the key
// "sboxesforserpent" (lower 4 bits of each ASCII letter). The non-optimized
// S-boxes are as follows:

//  sbox0: 3, 8, 15, 1, 10, 6, 5, 11, 14, 13, 4, 2, 7, 0, 9, 12,
//  sbox1: 15, 12, 2, 7, 9, 0, 5, 10, 1, 11, 14, 8, 6, 13, 3, 4,
//  sbox2: 8, 6, 7, 9, 3, 12, 10, 15, 13, 1, 14, 4, 0, 11, 5, 2,
//  sbox3: 0, 15, 11, 8, 12, 9, 6, 3, 13, 1, 2, 4, 10, 7, 5, 14,
//  sbox4: 1, 15, 8, 3, 12, 0, 11, 6, 2, 5, 4, 10, 9, 14, 7, 13,
//  sbox5: 15, 5, 2, 11, 4, 10, 9, 12, 0, 3, 14, 8, 13, 6, 7, 1,
//  sbox6: 7, 2, 12, 5, 8, 4, 6, 11, 14, 9, 1, 15, 13, 3, 10, 0,
//  sbox7: 1, 13, 15, 0, 14, 8, 2, 11, 7, 4, 12, 10, 9, 3, 5, 6

// isbox0: 13, 3, 11, 0, 10, 6, 5, 12, 1, 14, 4, 7, 15, 9, 8, 2,
// isbox1: 5, 8, 2, 14, 15, 6, 12, 3, 11, 4, 7, 9, 1, 13, 10, 0,
// isbox2: 12, 9, 15, 4, 11, 14, 1, 2, 0, 3, 6, 13, 5, 8, 10, 7,
// isbox3: 0, 9, 10, 7, 11, 14, 6, 13, 3, 5, 12, 2, 4, 8, 15, 1,
// isbox4: 5, 0, 8, 3, 10, 9, 7, 14, 2, 12, 11, 6, 4, 15, 13, 1,
// isbox5: 8, 15, 2, 9, 4, 1, 13, 14, 11, 6, 5, 3, 7, 12, 10, 0,
// isbox6: 15, 10, 1, 13, 5, 3, 6, 0, 4, 9, 14, 7, 2, 12, 8, 11,
// isbox7: 3, 0, 6, 13, 9, 14, 15, 8, 5, 12, 11, 7, 10, 1, 4, 2

function sbox0(v)
{
	const [a, b, c, d] = v;

	const
		t1  = a ^ d,
		t2  = a & d,
		t3  = c ^ t1,
		t6  = b & t1,
		t4  = b ^ t3,
		t10 = ~t3,
		h   = t2 ^ t4,
		t7  = a ^ t6,
		t14 = ~t7,
		t8  = c | t7,
		t11 = t3 ^ t7,
		g   = t4 ^ t8,
		t12 = h & t11,
		f   = t10 ^ t12,
		e   = t12 ^ t14;

	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function isbox0(v)
{
	const [a, b, c, d] = v;

	const
		t1  = ~a,
		t2  = a ^ b,
		t3  = t1 | t2,
		t4  = d ^ t3,
		t7  = d & t2,
		t5  = c ^ t4,
		t8  = t1 ^ t7,
		g   = t2 ^ t5,
		t11 = a & t4,
		t9  = g & t8,
		t14 = t5 ^ t8,
		f   = t4 ^ t9,
		t12 = t5 | f,
		h   = t11 ^ t12,
		e   = h ^ t14;

	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function sbox1(v)
{
	const [a, b, c, d] = v;

	const
		t1  = ~a,
		t2  = b ^ t1,
		t3  = a | t2,
		t4  = d | t2,
		t5  = c ^ t3,
		g   = d ^ t5,
		t7  = b ^ t4,
		t8  = t2 ^ g,
		t9  = t5 & t7,
		h   = t8 ^ t9,
		t11 = t5 ^ t7,
		f   = h ^ t11,
		t13 = t8 & t11,
		e   = t5 ^ t13;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function isbox1(v)
{
	const [a, b, c, d] = v;

	const
		t1  = a ^ d,
		t2  = a & b,
		t3  = b ^ c,
		t4  = a ^ t3,
		t5  = b | d,
		t7  = c | t1,
		h   = t4 ^ t5,
		t8  = b ^ t7,
		t11 = ~t2,
		t9  = t4 & t8,
		f   = t1 ^ t9,
		t13 = t9 ^ t11,
		t12 = h & f,
		g   = t12 ^ t13,
		t15 = a & d,
		t16 = c ^ t13,
		e   = t15 ^ t16;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function sbox2(v)
{
	const [a, b, c, d] = v;

	const
		t1  = ~a,
		t2  = b ^ d,
		t3  = c & t1,
		t13 = d | t1,
		e   = t2 ^ t3,
		t5  = c ^ t1,
		t6  = c ^ e,
		t7  = b & t6,
		t10 = e | t5,
		h   = t5 ^ t7,
		t9  = d | t7,
		t11 = t9 & t10,
		t14 = t2 ^ h,
		g   = a ^ t11,
		t15 = g ^ t13,
		f   = t14 ^ t15;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function isbox2(v)
{
	const [a, b, c, d] = v;

	const
		t1  = b ^ d,
		t2  = ~t1,
		t3  = a ^ c,
		t4  = c ^ t1,
		t7  = a | t2,
		t5  = b & t4,
		t8  = d ^ t7,
		t11 = ~t4,
		e   = t3 ^ t5,
		t9  = t3 | t8,
		t14 = d & t11,
		h   = t1 ^ t9,
		t12 = e | h,
		f   = t11 ^ t12,
		t15 = t3 ^ t12,
		g   = t14 ^ t15;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function sbox3(v)
{
	const [a, b, c, d] = v;

	const
		t1  = a ^ b,
		t2  = a & c,
		t3  = a | d,
		t4  = c ^ d,
		t5  = t1 & t3,
		t6  = t2 | t5,
		g   = t4 ^ t6,
		t8  = b ^ t3,
		t9  = t6 ^ t8,
		t10 = t4 & t9,
		e   = t1 ^ t10,
		t12 = g & e,
		f   = t9 ^ t12,
		t14 = b | d,
		t15 = t4 ^ t12,
		h   = t14 ^ t15;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function isbox3(v)
{
	const [a, b, c, d] = v;

	const
		t1  = b ^ c,
		t2  = b | c,
		t3  = a ^ c,
		t7  = a ^ d,
		t4  = t2 ^ t3,
		t5  = d | t4,
		t9  = t2 ^ t7,
		e   = t1 ^ t5,
		t8  = t1 | t5,
		t11 = a & t4,
		g   = t8 ^ t9,
		t12 = e | t9,
		f   = t11 ^ t12,
		t14 = a & g,
		t15 = t2 ^ t14,
		t16 = e & t15,
		h   = t4 ^ t16;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function sbox4(v)
{
	const [a, b, c, d] = v;

	const
		t1  = a ^ d,
		t2  = d & t1,
		t3  = c ^ t2,
		t4  = b | t3,
		h   = t1 ^ t4,
		t6  = ~b,
		t7  = t1 | t6,
		e   = t3 ^ t7,
		t9  = a & e,
		t10 = t1 ^ t6,
		t11 = t4 & t10,
		g   = t9 ^ t11,
		t13 = a ^ t3,
		t14 = t10 & g,
		f   = t13 ^ t14;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function isbox4(v)
{
	const [a, b, c, d] = v;

	const
		t1  = c ^ d,
		t2  = c | d,
		t3  = b ^ t2,
		t4  = a & t3,
		f   = t1 ^ t4,
		t6  = a ^ d,
		t7  = b | d,
		t8  = t6 & t7,
		h   = t3 ^ t8,
		t10 = ~a,
		t11 = c ^ h,
		t12 = t10 | t11,
		e   = t3 ^ t12,
		t14 = c | t4,
		t15 = t7 ^ t14,
		t16 = h | t10,
		g   = t15 ^ t16;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function sbox5(v)
{
	const [a, b, c, d] = v;

	const
		t1  = ~a,
		t2  = a ^ b,
		t3  = a ^ d,
		t4  = c ^ t1,
		t5  = t2 | t3,
		e   = t4 ^ t5,
		t7  = d & e,
		t8  = t2 ^ e,
		t10 = t1 | e,
		f   = t7 ^ t8,
		t11 = t2 | t7,
		t12 = t3 ^ t10,
		t14 = b ^ t7,
		g   = t11 ^ t12,
		t15 = f & t12,
		h   = t14 ^ t15;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function isbox5(v)
{
	const [a, b, c, d] = v;

	const
		t1  = ~c,
		t2  = b & t1,
		t3  = d ^ t2,
		t4  = a & t3,
		t5  = b ^ t1,
		h   = t4 ^ t5,
		t7  = b | h,
		t8  = a & t7,
		f   = t3 ^ t8,
		t10 = a | d,
		t11 = t1 ^ t7,
		e   = t10 ^ t11,
		t13 = a ^ c,
		t14 = b & t10,
		t15 = t4 | t13,
		g   = t14 ^ t15;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function sbox6(v)
{
	const [a, b, c, d] = v;

	const
		t1  = ~a,
		t2  = a ^ d,
		t3  = b ^ t2,
		t4  = t1 | t2,
		t5  = c ^ t4,
		f   = b ^ t5,
		t13 = ~t5,
		t7  = t2 | f,
		t8  = d ^ t7,
		t9  = t5 & t8,
		g   = t3 ^ t9,
		t11 = t5 ^ t8,
		e   = g ^ t11,
		t14 = t3 & t11,
		h   = t13 ^ t14;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function isbox6(v)
{
	const [a, b, c, d] = v;

	const
		t1  = ~a,
		t2  = a ^ b,
		t3  = c ^ t2,
		t4  = c | t1,
		t5  = d ^ t4,
		t13 = d & t1,
		f   = t3 ^ t5,
		t7  = t3 & t5,
		t8  = t2 ^ t7,
		t9  = b | t8,
		h   = t5 ^ t9,
		t11 = b | h,
		e   = t8 ^ t11,
		t14 = t3 ^ t11,
		g   = t13 ^ t14;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function sbox7(v)
{
	const [a, b, c, d] = v;

	const
		t1  = ~c,
		t2  = b ^ c,
		t3  = b | t1,
		t4  = d ^ t3,
		t5  = a & t4,
		t7  = a ^ d,
		h   = t2 ^ t5,
		t8  = b ^ t5,
		t9  = t2 | t8,
		t11 = d & t3,
		f   = t7 ^ t9,
		t12 = t5 ^ f,
		t15 = t1 | t4,
		t13 = h & t12,
		g   = t11 ^ t13,
		t16 = t12 ^ g,
		e   = t15 ^ t16;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function isbox7(v)
{
	const [a, b, c, d] = v;

	const
		t1  = a & b,
		t2  = a | b,
		t3  = c | t1,
		t4  = d & t2,
		h   = t3 ^ t4,
		t6  = ~d,
		t7  = b ^ t4,
		t8  = h ^ t6,
		t11 = c ^ t7,
		t9  = t7 | t8,
		f   = a ^ t9,
		t12 = d | f,
		e   = t11 ^ t12,
		t14 = a & h,
		t15 = t3 ^ f,
		t16 = e ^ t14,
		g   = t15 ^ t16;
	
	v[0] = e; v[1] = f; v[2] = g; v[3] = h;
}

function rot(v)
{
	let [a, b, c, d] = v;

	a  = rol(a, 13);
	c  = rol(c, 3);
	d ^= c ^ (a << 3);
	b ^= a ^ c;
	d  = rol(d, 7);
	b  = rol(b, 1);
	a ^= b ^ d;
	c ^= d ^ (b << 7);
	a  = rol(a, 5);
	c  = rol(c, 22);

	v[0] = a; v[1] = b; v[2] = c; v[3] = d;
}

function irot(v)
{
	let [a, b, c, d] = v;

	c  = ror(c, 22);
	a  = ror(a, 5);
	c ^= d ^ (b << 7);
	a ^= b ^ d;
	d  = ror(d, 7);
	b  = ror(b, 1);
	d ^= c ^ (a << 3);
	b ^= a ^ c;
	c  = ror(c, 3);
	a  = ror(a, 13);

	v[0] = a; v[1] = b; v[2] = c; v[3] = d;
}

const SBOXES = [sbox0, sbox1, sbox2, sbox3, sbox4, sbox5, sbox6, sbox7];
const I_SBOXES = [isbox0, isbox1, isbox2, isbox3, isbox4, isbox5, isbox6, isbox7];

class SerpentTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("variant", "Variant", "serpent", { type: "select", values: VARIANT_VALUES, texts: VARIANT_NAMES });
	}

	generateSubKeys(keyBytes)
	{
		keyBytes = this.tnepresize(keyBytes);

		const keyLength = keyBytes.length;
		let lIndex = Math.floor(keyLength / 4);
		const wholeKeyWordBytes = lIndex * 4;

		const lKey = bytesToInt32sLE(keyBytes.subarray(0, wholeKeyWordBytes)).concat(new Array(140 - lIndex));

		let word = 0;
		for (let i = wholeKeyWordBytes; i < keyLength; i++)
		{
			word <<= 8;
			word |= keyBytes[i];
		}

		if (lIndex < 8)
		{
			// Add remaining bytes - or a 0 word - with padding 1-bit
			lKey[lIndex++] = word | (1 << ((keyLength % 4) * 8));

			// Pad rest with zeroes
			while (lIndex < 8)
			{
				lKey[lIndex++] = 0;
			}
		}

		for (let i = 0; i < 132; i++)
		{
			const lk = lKey[i] ^ lKey[i + 3] ^ lKey[i + 5] ^ lKey[i + 7] ^ GOLDEN_RATIO ^ i;
			lKey[i + 8] = rol(lk, 11);
		}

		let r = 0;
		for (let i = 8; i < 140; i += 4)
		{
			// TODO: Make all the key extension work on 128-bit arrays
			const k = [
				lKey[i], 
				lKey[i + 1],  
				lKey[i + 2], 
				lKey[i + 3]
			];

			const sbox = SBOXES[7 - (r + 4) % 8];
			sbox(k);

			lKey[i] = k[0];
			lKey[i + 1] = k[1];
			lKey[i + 2] = k[2];
			lKey[i + 3] = k[3];
			r++;
		}

		return lKey;
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, { min: 1, max: 256 });

		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 128, subKeys);
	}

	tnepresize(bytes, inplace)
	{
		// The "Tnepres" variant is an implementation that takes the AES competition test vectors at face value
		// - those are actually byte reversed output.
		// So, here we reverse any input bytes (key and blocks) as well as output blocks.
		// Note that input blocks are reversed *including padding* (this is the same as other implementations
		// - where padding is usually applied before entering the cipher itself)
		if (this.options.variant === "tnepres")
		{
			// Don't mutate the original block unless we asked to (for output)!
			bytes = inplace ? bytes : Uint8Array.from(bytes);
			bytes.reverse();
		}
		return bytes;
	}
}

class SerpentEncryptTransform extends SerpentTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		block = this.tnepresize(block);

		const v = bytesToInt32sLE(block);

		for (let r = 0; r < ROUNDS; r++)
		{
			const keyIndex = r * 4 + 8;
			for (let i = 0; i < 4; i++)
			{
				v[i] ^= subKeys[keyIndex + i];
			}

			const sbox = SBOXES[r % 8];
			sbox(v);
			if (r < ROUNDS - 1)
			{
				rot(v);
			}
			else
			{
				for (let i = 0; i < 4; i++)
				{
					v[i] ^= subKeys[136 + i];
				}
			}
		}

		const result = this.tnepresize(int32sToBytesLE(v), true);

		dest.set(result, destOffset);
	}
}

class SerpentDecryptTransform extends SerpentTransform
{
	constructor()
	{
		super(true);
	}

	// Decryption reverses the subkey order, and uses the
	// inverse rotation (linear transformation) and inverse sboxes
	transformBlock(block, dest, destOffset, subKeys)
	{
		block = this.tnepresize(block);

		const v = bytesToInt32sLE(block);

		for (let r = ROUNDS - 1; r >= 0; r--)
		{
			if (r < ROUNDS - 1)
			{
				irot(v);
			}
			else
			{
				for (let i = 0; i < 4; i++)
				{
					v[i] ^= subKeys[136 + i];
				}
			}

			const sbox = I_SBOXES[r % 8];
			sbox(v);

			const keyIndex = r * 4 + 8;
			for (let i = 0; i < 4; i++)
			{
				v[i] ^= subKeys[keyIndex + i];
			}
		}

		const result = this.tnepresize(int32sToBytesLE(v), true);

		dest.set(result, destOffset);
	}
}

export {
	SerpentEncryptTransform,
	SerpentDecryptTransform
};