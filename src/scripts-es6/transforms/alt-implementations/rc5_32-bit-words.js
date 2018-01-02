import { BlockCipherTransform } from "../block-ciphers/block-cipher";
import { int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";
import { add, rol, ror } from "../../cryptopunk.bitarith";

const P_32 = 0xb7e15163;
const Q_32 = 0x9e3779b9;

const WORD_SIZE = 32;
const WORD_LENGTH = 4;

class Rc5BaseTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	generateSubKeys(keyBytes)
	{
		const keyLength = keyBytes.length;
		const keyWordCount = Math.ceil(Math.max(keyLength, 1) / WORD_LENGTH);

		const L = new Array(keyWordCount);
		L.fill(0);
		for (let i = keyLength - 1; i >= 0; i--)
		{
			const index = Math.floor(i / WORD_LENGTH);
			L[index] <<= 8;
			L[index] |= keyBytes[i];
		}

		const roundKeyCount = this.roundKeyCount;

		const S = new Array(roundKeyCount);
		S[0] = P_32;

		for (let i = 1; i < roundKeyCount; i++)
		{
			S[i] = add(S[i - 1], Q_32);
		}

		let i = 0,
			j = 0,
			a = 0,
			b = 0;

		const keySchedulingCount = Math.max(roundKeyCount, keyWordCount) * 3;

		for (let index = 0; index < keySchedulingCount; index++)
		{
			a = S[i] = rol(add(S[i], a, b), 3);
			b = L[j] = rol(add(L[j], a, b), add(a, b) % WORD_SIZE);
			i = (i + 1) % roundKeyCount;
			j = (j + 1) % keyWordCount;
		}

		return S;
	}

	transform(bytes, keyBytes)
	{
		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, this.blockSize, subKeys);
	}
}

class Rc5Transform extends Rc5BaseTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("rounds", "Rounds", 12, { min: 0, max: 255 });
	}

	get roundKeyCount()
	{
		return 2 * this.options.rounds + 2;
	}

	get blockSize()
	{
		return 64;
	}
}

class Rc5EncryptTransform extends Rc5Transform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const rounds = this.options.rounds;

		let [a, b] = bytesToInt32sLE(block);
		a = add(a, subKeys[0]);
		b = add(b, subKeys[1]);

		for (let i = 1; i <= rounds; i++)
		{
			// Rotating by a and b, which are 32-bit numbers, we explicitly use e.g. a % wordSize.
			// This makes the similarity to 16 and 64 bit word sizes more clear, although it isn't
			// actually necessary - the rol/ror functions use javascript's shift operators, which
			// only look at the the lowest 5 bits of the count anyway.
			a = add(rol(a ^ b, b % WORD_SIZE), subKeys[2 * i]);
			b = add(rol(b ^ a, a % WORD_SIZE), subKeys[2 * i + 1]);
		}

		dest.set(int32sToBytesLE([a, b]), destOffset);
	}
}

class Rc5DecryptTransform extends Rc5Transform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const rounds = this.options.rounds;

		let [a, b] = bytesToInt32sLE(block);

		for (let i = rounds; i >= 1; i--)
		{
			b = ror(add(b, -subKeys[2 * i + 1]), a % 32) ^ a;
			a = ror(add(a, -subKeys[2 * i]), b % 32) ^ b;
		}

		b = add(b, -subKeys[1]);
		a = add(a, -subKeys[0]);

		dest.set(int32sToBytesLE([a, b]), destOffset);
	}
}

export {
	Rc5BaseTransform,
	Rc5EncryptTransform,
	Rc5DecryptTransform
};