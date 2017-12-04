import { MdHashTransform } from "./hash";
import { ROOTS } from "../shared/constants";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { add, ror } from "../../cryptopunk.bitarith";

// The first 32 bits of the fractional parts of the cube roots of the first 64 prime numbers.
const K = [
	0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
	0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
	0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
	0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
	0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
	0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
	0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
	0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

class Sha256Transform extends MdHashTransform
{
	constructor()
	{
		super(512, "BE");
	}

	getIV()
	{
		// The one main difference between SHA-256 and SHA-224 is the initial hash values
		// For SHA-256: First 32 bits of the fractional parts of the square roots of the first 8 prime numbers
		return [
			ROOTS.SQRT2, 
			ROOTS.SQRT3, 
			ROOTS.SQRT5, 
			ROOTS.SQRT7, 
			ROOTS.SQRT11, 
			ROOTS.SQRT13, 
			ROOTS.SQRT17, 
			ROOTS.SQRT19
		];
	}

	transform(bytes)
	{
		const state = this.getIV();

		this.transformBlocks(bytes, state);

		if (this.isSha224)
		{
			// Leaves out h
			state.pop();
		}

		return int32sToBytesBE(state);
	}

	transformBlock(block, state)
	{
		const x = bytesToInt32sBE(block);
		
		// Extend from 16 to 64 (d)words
		for (let index = 16; index < 64; index++)
		{
			const x15 = x[index - 15];
			const x2  = x[index - 2];
			const s0 = ror(x15,  7) ^ ror(x15, 18) ^ (x15 >>> 3);
			const s1 = ror(x2, 17) ^ ror(x2, 19) ^ (x2 >>> 10);
			x[index] = add(x[index - 7], s0, x[index - 16], s1);
		}

		let [a, b, c, d, e, f, g, h] = state;

		for (let step = 0; step < x.length; step++)
		{
			const S1 = ror(e, 6) ^ ror(e, 11) ^ ror(e, 25);
			const ch = (e & f) ^ (~e & g);
			const temp1 = add(h, S1, ch, x[step], K[step]);
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

		state[0] = add(state[0], a);
		state[1] = add(state[1], b);
		state[2] = add(state[2], c);
		state[3] = add(state[3], d);
		state[4] = add(state[4], e);
		state[5] = add(state[5], f);
		state[6] = add(state[6], g);
		state[7] = add(state[7], h);
	}
}

class Sha224Transform extends Sha256Transform
{
	constructor()
	{
		super();
		this.isSha224 = true;
	}

	getIV()
	{
		// The one main difference between SHA-256 and SHA-224 is the initial hash values
		// For SHA-224: The *second* 32 bits of the fractional parts of the square roots of the 9th through 16th prime numbers.
		return [
			ROOTS.SQRT23_2,
			ROOTS.SQRT29_2,
			ROOTS.SQRT31_2,
			ROOTS.SQRT37_2,
			ROOTS.SQRT41_2,
			ROOTS.SQRT43_2,
			ROOTS.SQRT47_2,
			ROOTS.SQRT53_2
		];
	}
}

export {
	Sha224Transform,
	Sha256Transform
};