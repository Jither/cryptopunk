import { Rc5BaseTransform } from "./rc5_32-bit-words";
import { int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";
import { add, mul, rol, ror } from "../../cryptopunk.bitarith";

const WORD_SIZE = 32;
const ROT = 5;

class Rc6Transform extends Rc5BaseTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("rounds", "Rounds", 20, { min: 0, max: 255 });
	}

	get blockSize()
	{
		return 128;
	}

	get roundKeyCount()
	{
		return 2 * this.options.rounds + 4;
	}
}

class Rc6EncryptTransform extends Rc6Transform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const rounds = this.options.rounds;

		let [a, b, c, d] = bytesToInt32sLE(block);
		b = add(b, subKeys[0]);
		d = add(d, subKeys[1]);

		for (let i = 1; i <= rounds; i++)
		{
			// 2 * b + 1 will stay well within 2^53 limit, so we can use javascript multiplication.
			// Multiplying the result with b, however, will not. Hence the mul() function call.
			// TODO: Math.imul can be used instead
			const t = rol(mul(b, (2 * b + 1)), ROT);
			const u = rol(mul(d, (2 * d + 1)), ROT);
			a = add(rol(a ^ t, u % WORD_SIZE), subKeys[2 * i]);
			c = add(rol(c ^ u, t % WORD_SIZE), subKeys[2 * i + 1]);

			[a, b, c, d] = [b, c, d, a];
		}

		a = add(a, subKeys[2 * rounds + 2]);
		c = add(c, subKeys[2 * rounds + 3]);

		dest.set(int32sToBytesLE([a, b, c, d]), destOffset);
	}
}

class Rc6DecryptTransform extends Rc6Transform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const rounds = this.options.rounds;

		let [a, b, c, d] = bytesToInt32sLE(block);
		c = add(c, -subKeys[2 * rounds + 3]);
		a = add(a, -subKeys[2 * rounds + 2]);

		for (let i = rounds; i >= 1; i--)
		{
			[a, b, c, d] = [d, a, b, c];

			const u = rol(mul(d, (2 * d + 1)), ROT);
			const t = rol(mul(b, (2 * b + 1)), ROT);
			c = ror(add(c, -subKeys[2 * i + 1]), t % WORD_SIZE) ^ u;
			a = ror(add(a, -subKeys[2 * i]), u % WORD_SIZE) ^ t;
		}

		d = add(d, -subKeys[1]);
		b = add(b, -subKeys[0]);

		dest.set(int32sToBytesLE([a, b, c, d]), destOffset);
	}
}

export {
	Rc6EncryptTransform,
	Rc6DecryptTransform
};