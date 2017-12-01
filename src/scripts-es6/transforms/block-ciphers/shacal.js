import { TransformError } from "../transforms";
import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { add, rol, ror, sub } from "../../cryptopunk.bitarith";
import { ROOTS, INIT } from "../shared/constants";

// SHACAL is SHA-1 and SHA-2 hash functions used for encryption.
// For completion's sake, although not part of the specification, SHA-0 ("SHACAL-0") is included.

// TODO: Much of this is copied verbatim from SHA-1 and SHA-2 implementations.
// Find a nice way to share it.

const VARIANT_VALUES = [
	"SHACAL-0",
	"SHACAL-1",
	"SHACAL-2"
];

const K_SHA1 = [
	ROOTS.SQRT2_DIV4,
	ROOTS.SQRT3_DIV4,
	ROOTS.SQRT5_DIV4,
	ROOTS.SQRT10_DIV4
];

const K_SHA2 = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function F(a, b, c, d, e, x, t)
{
	return add((b & c) ^ (~b & d), rol(a, 5), e, x, t);
}

function G(a, b, c, d, e, x, t)
{
	return add(b ^ c ^ d, rol(a, 5), e, x, t);
}

function H(a, b, c, d, e, x, t)
{
	return add((b & c) ^ (b & d) ^ (c & d), rol(a, 5), e, x, t);
}

const STEPS = 80;
const OPS = [F, G, H, G];

class ShacalTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("variant", "Variant", "SHACAL-1", { type: "select", texts: VARIANT_VALUES });
	}

	transform(bytes, keyBytes)
	{
		const variant = this.options.variant;
		let keys, blockSize;
		switch (variant)
		{
			case "SHACAL-0":
				this.transformBlock = this.transformBlockSHA1;
				keys = this.generateKeysSHA1(keyBytes, true);
				blockSize = 160;
				break;
			case "SHACAL-1":
				this.transformBlock = this.transformBlockSHA1;
				keys = this.generateKeysSHA1(keyBytes, false);
				blockSize = 160;
				break;
			case "SHACAL-2":
				this.transformBlock = this.transformBlockSHA2;
				keys = this.generateKeysSHA2(keyBytes);
				blockSize = 256;
				break;
			default:
				throw new TransformError(`Unknown variant: ${variant}`);
		}

		// Reverse order of keys for decryption
		if (this.decrypt)
		{
			keys.reverse();
		}

		return this.transformBlocks(bytes, blockSize, keys);
	}

	generateKeysSHA1(keyBytes, sha0)
	{
		const x = bytesToInt32sBE(keyBytes);
		
		// "Shorter keys may be used by padding the key with zeroes to a 512-bit string"
		for (let i = x.length; i < 16; i++)
		{
			x.push(0);
		}

		// Extend from 16 to 80 (d)words
		for (let index = 16; index < STEPS; index++)
		{
			let extension = x[index - 3] ^ x[index - 8] ^ x[index - 14] ^ x[index - 16];
			if (!sha0)
			{
				// The one difference between the withdrawn "SHA-0" and SHA-1:
				extension = rol(extension, 1);
			}
			x[index] = extension;
		}

		return x;
	}

	generateKeysSHA2(keyBytes)
	{
		const x = bytesToInt32sBE(keyBytes);

		// "Shorter keys may be used by padding the key with zeroes to a 512-bit string"
		for (let i = x.length; i < 16; i++)
		{
			x.push(0);
		}

		// Extend from 16 to 64 (d)words
		for (let index = 16; index < 64; index++)
		{
			const x15 = x[index - 15];
			const x2  = x[index - 2];
			const s0 = ror(x15,  7) ^ ror(x15, 18) ^ (x15 >>> 3);
			const s1 = ror(x2, 17) ^ ror(x2, 19) ^ (x2 >>> 10);
			x[index] = add(x[index - 7], s0, x[index - 16], s1);
		}

		return x;
	}

}

class ShacalEncryptTransform extends ShacalTransform
{
	constructor()
	{
		super(false);
	}

	transformBlockSHA1(block, dest, destOffset, keys)
	{
		// The initial state of the hash is replaced by the plaintext
		// The message of the hash is replaced by the key
		const state = bytesToInt32sBE(block);

		let [a, b, c, d, e] = state;

		let round = -1,
			op,
			k;
		
		for (let step = 0; step < STEPS; step++)
		{
			if (step % 20 === 0)
			{
				round++;
				op = OPS[round];
				k = K_SHA1[round];
			}
			const temp = op(a, b, c, d, e, keys[step], k);

			e = d;
			d = c;
			c = rol(b, 30);
			b = a;
			a = temp;
		}

		// We skip the plaintext addition to the state at the end

		dest.set(int32sToBytesBE([a, b, c, d, e]), destOffset);
	}

	transformBlockSHA2(block, dest, destOffset, keys)
	{
		// The initial state of the hash is replaced by the plaintext
		// The message of the hash is replaced by the key
		const state = bytesToInt32sBE(block);
		let [a, b, c, d, e, f, g, h] = state;
		
		for (let step = 0; step < keys.length; step++)
		{
			const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = add(h, S1, ch, keys[step], K_SHA2[step]);
			const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp2 = add(S0, maj);
			h = g;
			g = f;
			f = e;
			e = add(d, temp1);
			d = c;
			c = b;
			b = a;
			a = add(temp1, temp2);
		}

		dest.set(int32sToBytesBE([a, b, c, d, e, f, g, h]), destOffset);
	}
}

class ShacalDecryptTransform extends ShacalTransform
{
	constructor()
	{
		super(true);
	}

	transformBlockSHA1(block, dest, destOffset, keys)
	{
		// The initial state of the hash is replaced by the plaintext
		// The message of the hash is replaced by the key
		const state = bytesToInt32sBE(block);

		let [a, b, c, d, e] = state;

		let round = 4,
			op,
			k;
		
		for (let step = 0; step < STEPS; step++)
		{
			if (step % 20 === 0)
			{
				round--;
				op = OPS[round];
				k = K_SHA1[round];
			}

			const temp = a;
			a = b;
			b = ror(c, 30); // Encrypt: ROL - Decrypt: ROR
			c = d;
			d = e;
			e = sub(temp, op(a, b, c, d, 0, keys[step], k)); // NOTE! Decrypt = Don't add e here
		}

		// We skip the plaintext addition to the state at the end

		dest.set(int32sToBytesBE([a, b, c, d, e]), destOffset);
	}

	transformBlockSHA2(block, dest, destOffset, keys)
	{
		// The initial state of the hash is replaced by the plaintext
		// The message of the hash is replaced by the key
		const state = bytesToInt32sBE(block);
		let [a, b, c, d, e, f, g, h] = state;
		
		for (let step = 0; step < keys.length; step++)
		{
			const temp1 = a;
			a = b;
			b = c;
			c = d;
			const temp2 = e;
			e = f;
			f = g;
			g = h;
			const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp3 = add(S1, ch, keys[step], K_SHA2[63 - step]); // NOTE! Decrypt = Don't add h here. Also, reverse round constants
			const S0 = ror(a, 2) ^ ror(a, 13) ^ ror(a, 22);
			const maj = (a & b) ^ (a & c) ^ (b & c);
			const temp4 = add(S0, maj);
			h = sub(temp1, add(temp3, temp4));
			d = sub(temp2, add(h, temp3));
		}

		dest.set(int32sToBytesBE([a, b, c, d, e, f, g, h]), destOffset);
	}
}

export {
	ShacalEncryptTransform,
	ShacalDecryptTransform
};