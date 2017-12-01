import { MdHashTransform } from "./hash";
import { ROOTS, INIT } from "../shared/constants";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { add, rol } from "../../cryptopunk.bitarith";

const K = [
	ROOTS.SQRT2_DIV4,
	ROOTS.SQRT3_DIV4,
	ROOTS.SQRT5_DIV4,
	ROOTS.SQRT10_DIV4
];

function f(a, b, c, d, e, x, t)
{
	return add((b & c) ^ (~b & d), rol(a, 5), e, x, t);
}

function g(a, b, c, d, e, x, t)
{
	return add(b ^ c ^ d, rol(a, 5), e, x, t);
}

function h(a, b, c, d, e, x, t)
{
	return add((b & c) ^ (b & d) ^ (c & d), rol(a, 5), e, x, t);
}

const STEPS = 80;
const OPS = [f, g, h, g];

class Sha1Transform extends MdHashTransform
{
	constructor()
	{
		super(512, "BE");
	}

	transform(bytes)
	{
		const state = [
			INIT._1_67,
			INIT._2_EF,
			INIT._3_98,
			INIT._4_10,
			INIT._5_C3
		];

		this.transformBlocks(bytes, state);

		return int32sToBytesBE(state);
	}

	transformBlock(block, state)
	{
		const x = bytesToInt32sBE(block);
		
		// Extend from 16 to 80 (d)words
		for (let index = 16; index < STEPS; index++)
		{
			let extension = x[index - 3] ^ x[index - 8] ^ x[index - 14] ^ x[index - 16];
			if (!this.sha0)
			{
				// The one difference between the withdrawn "SHA-0" and SHA-1:
				extension = rol(extension, 1);
			}
			x[index] = extension;
		}

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
				k = K[round];
			}
			const temp = op(a, b, c, d, e, x[step], k);

			e = d;
			d = c;
			c = rol(b, 30);
			b = a;
			a = temp;
		}

		state[0] = add(state[0], a);
		state[1] = add(state[1], b);
		state[2] = add(state[2], c);
		state[3] = add(state[3], d);
		state[4] = add(state[4], e);
	}
}

class Sha0Transform extends Sha1Transform
{
	constructor()
	{
		super();
		this.sha0 = true;
	}
}


export {
	Sha0Transform,
	Sha1Transform
};