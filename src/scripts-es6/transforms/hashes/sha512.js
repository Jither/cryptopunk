import { MdHashTransform } from "./hash";
import { TransformError } from "../transforms";
import { bytesToInt64sBE, int64sToBytesBE, asciiToBytes } from "../../cryptopunk.utils";
import { add64, and64, not64, ror64, shr64, xor64 } from "../../cryptopunk.bitarith";

// SHA-512 (and 384) have an identical structure to SHA-256 (and 224), except they use 64-bit words
// rather than 32-bit, and use different constants and shift amounts. Since Javascript integers are
// only accurate up to 2^53, not 2^64 - and bit arithmetic in JS is 32 bit,  we need manual bit
// arithmetic for this.

// The first 64 bits of the fractional parts of the cube roots of the first 80 prime numbers.
const K = [
	0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd, 0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
	0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019, 0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
	0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe, 0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
	0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1, 0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
	0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3, 0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
	0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483, 0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
	0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210, 0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
	0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725, 0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
	0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926, 0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
	0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8, 0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
	0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001, 0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
	0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910, 0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
	0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53, 0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
	0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb, 0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
	0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60, 0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
	0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9, 0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
	0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207, 0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
	0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6, 0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
	0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493, 0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
	0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a, 0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

class Sha512Transform extends MdHashTransform
{
	constructor()
	{
		super(1024, "BE", 16);
	}

	getIV()
	{
		// The one main difference between SHA-512 and SHA-384 is the initial hash values
		// For SHA-512: First 64 bits of the fractional parts of the square roots of the first 8 prime numbers
		return [
			{ hi: 0x6a09e667, lo: 0xf3bcc908 },
			{ hi: 0xbb67ae85, lo: 0x84caa73b },
			{ hi: 0x3c6ef372, lo: 0xfe94f82b }, 
			{ hi: 0xa54ff53a, lo: 0x5f1d36f1 }, 
			{ hi: 0x510e527f, lo: 0xade682d1 }, 
			{ hi: 0x9b05688c, lo: 0x2b3e6c1f }, 
			{ hi: 0x1f83d9ab, lo: 0xfb41bd6b }, 
			{ hi: 0x5be0cd19, lo: 0x137e2179 }
		];
	}

	transform(bytes)
	{
		const state = this.getIV();

		this.transformBlocks(bytes, state);

		if (this.isSha384)
		{
			// Leaves out g and h
			state.splice(-2);
		}

		return int64sToBytesBE(state);
	}

	transformBlock(block, state)
	{
		let [a, b, c, d, e, f, g, h] = state;

		// Copy chunk to work array:
		const x = bytesToInt64sBE(block);
		
		// Extend from 16 to 80 (q)words
		for (let index = 16; index < 80; index++)
		{
			const x15 = x[index - 15];
			const x2  = x[index - 2];
			const s0  = xor64(ror64(x15,  1), ror64(x15,  8), shr64(x15, 7));
			const s1  = xor64(ror64( x2, 19), ror64( x2, 61), shr64( x2, 6));
			const x7  = x[index - 7];
			const x16 = x[index - 16];
			x[index]  = add64(x7, s0, x16, s1);
		}

		for (let step = 0; step < x.length; step++)
		{
			const S1 = xor64(ror64(e, 14), ror64(e, 18), ror64(e, 41));
			const ch = xor64(and64(e, f), and64(not64(e), g));
			const temp1 = add64(h, S1, ch, x[step], { hi: K[step * 2], lo: K[step * 2 + 1] });
			const S0 = xor64(ror64(a, 28), ror64(a, 34), ror64(a, 39));
			const maj = xor64(and64(a, b), and64(a, c), and64(b, c));
			const temp2 = add64(S0, maj);
			h = g;
			g = f;
			f = e;
			e = add64(d, temp1);
			d = c;
			c = b;
			b = a;
			a = add64(temp1, temp2);
		}

		state[0] = add64(state[0], a);
		state[1] = add64(state[1], b);
		state[2] = add64(state[2], c);
		state[3] = add64(state[3], d);
		state[4] = add64(state[4], e);
		state[5] = add64(state[5], f);
		state[6] = add64(state[6], g);
		state[7] = add64(state[7], h);
	}
}

class Sha384Transform extends Sha512Transform
{
	constructor()
	{
		super();
		this.isSha384 = true;
	}

	getIV()
	{
		// The one main difference between SHA-512 and SHA-384 is the initial hash values
		// For SHA-384: The first 64 bits of the fractional parts of the square roots of the 9th through 16th prime numbers.
		return [
			{ hi: 0xcbbb9d5d, lo: 0xc1059ed8 },
			{ hi: 0x629a292a, lo: 0x367cd507 },
			{ hi: 0x9159015a, lo: 0x3070dd17 },
			{ hi: 0x152fecd8, lo: 0xf70e5939 },
			{ hi: 0x67332667, lo: 0xffc00b31 },
			{ hi: 0x8eb44a87, lo: 0x68581511 },
			{ hi: 0xdb0c2e0d, lo: 0x64f98fa7 },
			{ hi: 0x47b5481d, lo: 0xbefa4fa4 }
		];
	}
}

const TRUNCATED_IV_CACHE = {};
const TRUNCATE_XOR = { hi: 0xa5a5a5a5, lo: 0xa5a5a5a5 };

class Sha512TruncatedTransform extends Sha512Transform
{
	constructor()
	{
		super();
		// "t is any positive integer without a leading zero such that t < 512, and t is not 384."
		// We make the additional requirement that t % 8 = 0
		this.addOption("size", "Size (for SHA-512/t)", 256, { min: 8, max: 504, step: 8 });
	}

	transform(bytes)
	{
		const size = this.options.size;

		if (size <= 0 || size >= 512)
		{
			throw new TransformError(`Size must be be > 0 and < 512 bits. Was: ${size} bits.`);
		}
		if (size % 8 !== 0)
		{
			throw new TransformError(`Size must be a multiple of 8 bits. Was: ${size} bits.`);
		}
		else if (size === 384)
		{
			throw new TransformError(`SHA-512/t specification does not allow size of 384 bits.`);
		}

		const state = this.getIV(size);

		this.transformBlocks(bytes, state);

		return int64sToBytesBE(state).subarray(0, size / 8);
	}

	getIV(size)
	{
		const result = TRUNCATED_IV_CACHE[size];
		if (result)
		{
			// Clone for future-proofing (when we do 64-bit arithmetic in-place)
			return result.map(h => { return { hi: h.hi, lo: h.lo }; });
		}

		// Truncated SHA-512 uses a generated IV that is:
		// SHA-512 of the ASCII string "SHA-512/t" (where t is the size)
		//   using the standard IV XOR'ed by 0xa5a5a5a5...

		const state = super.getIV();
		for (let i = 0; i < 8; i++)
		{
			state[i] = xor64(state[i], TRUNCATE_XOR);
		}

		const truncateSeed = asciiToBytes("SHA-512/" + size);
		this.transformBlocks(truncateSeed, state);

		TRUNCATED_IV_CACHE[size] = state;
		// Clone for future-proofing (when we do 64-bit arithmetic in-place)
		return state.map(h => { return { hi: h.hi, lo: h.lo }; });
	}
}

export {
	Sha384Transform,
	Sha512Transform,
	Sha512TruncatedTransform
};