import { Rc5BaseTransform } from "./rc5";
import { splitBytesLE, addBytes, addBytesSmall, rolBytes, xorBytes, mulBytes, mulBytesSmall, combineBytesLE, subBytes, rorBytes } from "../../cryptopunk.bitarith";

// This implementation uses byte arrays for values in order to allow all the supported word lengths.
// See alternative implementation rc6_32-bit-words.js for a simpler 32-bit word size version using plain JS numbers.

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
		const wordLength = wordSize / 8;
		const lastByte = wordLength - 1;
		const rounds = this.options.rounds;

		const rot = Math.log2(wordSize);

		const t = new Uint8Array(wordLength),
			u = new Uint8Array(wordLength);

		let [a, b, c, d] = splitBytesLE(block, wordLength);
		addBytes(b, subKeys[0]);
		addBytes(d, subKeys[1]);

		for (let i = 1; i <= rounds; i++)
		{
			t.set(b);
			mulBytesSmall(t, 2);
			addBytesSmall(t, 1);
			mulBytes(t, b);
			rolBytes(t, rot);

			u.set(d);
			mulBytesSmall(u, 2);
			addBytesSmall(u, 1);
			mulBytes(u, d);
			rolBytes(u, rot);

			xorBytes(a, t);
			const rotA = u[lastByte] % wordSize;
			rolBytes(a, rotA);
			addBytes(a, subKeys[2 * i]);

			xorBytes(c, u);
			const rotC = t[lastByte] % wordSize;
			rolBytes(c, rotC);
			addBytes(c, subKeys[2 * i + 1]);

			[a, b, c, d] = [b, c, d, a];
		}

		addBytes(a, subKeys[2 * rounds + 2]);
		addBytes(c, subKeys[2 * rounds + 3]);

		dest.set(combineBytesLE([a, b, c, d]), destOffset);
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
		const wordLength = wordSize / 8;
		const lastByte = wordLength - 1;
		const rounds = this.options.rounds;

		const rot = Math.log2(wordSize);

		const t = new Uint8Array(wordLength),
			u = new Uint8Array(wordLength);

		let [a, b, c, d] = splitBytesLE(block, wordLength);
		subBytes(c, subKeys[2 * rounds + 3]);
		subBytes(a, subKeys[2 * rounds + 2]);

		for (let i = rounds; i >= 1; i--)
		{
			[a, b, c, d] = [d, a, b, c];

			u.set(d);
			mulBytesSmall(u, 2);
			addBytesSmall(u, 1);
			mulBytes(u, d);
			rolBytes(u, rot);

			t.set(b);
			mulBytesSmall(t, 2);
			addBytesSmall(t, 1);
			mulBytes(t, b);
			rolBytes(t, rot);

			subBytes(c, subKeys[2 * i + 1]);
			const rotC = t[lastByte] % wordSize;
			rorBytes(c, rotC);
			xorBytes(c, u);

			subBytes(a, subKeys[2 * i]);
			const rotA = u[lastByte] % wordSize;
			rorBytes(a, rotA);
			xorBytes(a, t);
		}

		subBytes(d, subKeys[1]);
		subBytes(b, subKeys[0]);

		dest.set(combineBytesLE([a, b, c, d]), destOffset);
	}
}

export {
	Rc6EncryptTransform,
	Rc6DecryptTransform
};