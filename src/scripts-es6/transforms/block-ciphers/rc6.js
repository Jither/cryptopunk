import { Rc5BaseTransform } from "./rc5";
import { int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";
import { add, mul, rol, ror } from "../../cryptopunk.bitarith";

// TODO: 64 and 256 bit block sizes

const BLOCK_SIZES = [
	64,
	128,
	256
];

class Rc6Transform extends Rc5BaseTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("rounds", "Rounds", 20, { min: 0, max: 255 })
			.addOption("blockSize", "Block size", 128, { type: "select", texts: BLOCK_SIZES });
	}

	get wordSize()
	{
		return this.options.blockSize / 4;
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
		const wordSize = this.wordSize;
		const rounds = this.options.rounds;

		const rot = Math.log2(wordSize);

		let [a, b, c, d] = bytesToInt32sLE(block);
		b = add(b, subKeys[0]);
		d = add(d, subKeys[1]);

		for (let i = 1; i <= rounds; i++)
		{
			// 2 * b + 1 will stay well within 2^53 limit, so we can use javascript multiplication.
			// Multiplying the result with b, however, will not. Hence the mul() function call.
			// TODO: Math.imul can be used instead
			const t = rol(mul(b, (2 * b + 1)), rot);
			const u = rol(mul(d, (2 * d + 1)), rot);
			a = add(rol(a ^ t, u % wordSize), subKeys[2 * i]);
			c = add(rol(c ^ u, t % wordSize), subKeys[2 * i + 1]);

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
		const wordSize = this.wordSize;
		const rounds = this.options.rounds;

		const rot = Math.log2(wordSize);

		let [a, b, c, d] = bytesToInt32sLE(block);
		c = add(c, -subKeys[2 * rounds + 3]);
		a = add(a, -subKeys[2 * rounds + 2]);

		for (let i = rounds; i >= 1; i--)
		{
			[a, b, c, d] = [d, a, b, c];

			const u = rol(mul(d, (2 * d + 1)), rot);
			const t = rol(mul(b, (2 * b + 1)), rot);
			c = ror(add(c, -subKeys[2 * i + 1]), t % wordSize) ^ u;
			a = ror(add(a, -subKeys[2 * i]), u % wordSize) ^ t;
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