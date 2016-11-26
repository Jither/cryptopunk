import { BlockCipherTransform } from "./block-cipher";
import { int32sToBytesLE, bytesToInt32sLE } from "../../cryptopunk.utils";
import { add, rol, ror } from "../../cryptopunk.bitarith";

// TODO: 32 and 128 bit block sizes

const BLOCK_SIZES = [
	32,
	64,
	128
];

//const P_16 = 0xb7e1;
const P_32 = 0xb7e15163;
//const P_64 = { hi: 0xb7e15162, lo: 0x8aed2a6d };

//const Q_16 = 0x9e37;
const Q_32 = 0x9e3779b9;
//const Q_64 = { hi: 0x9E3779B9, lo: 0x7F4A7C15 };

class Rc5BaseTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	generateSubKeys(keyBytes)
	{
		const wordSize = this.wordSize;
		const wordLength = wordSize / 8;

		const keyLength = keyBytes.length;
		const keyWordCount = Math.ceil(Math.max(keyLength, 1) / wordLength);

		const L = new Array(keyWordCount);
		L.fill(0);
		for (let i = keyLength - 1; i >= 0; i--)
		{
			const index = Math.floor(i / wordLength);
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
			b = L[j] = rol(add(L[j], a, b), add(a, b) % wordSize);
			i = (i + 1) % roundKeyCount;
			j = (j + 1) % keyWordCount;
		}
		return S;
	}

	transform(bytes, keyBytes)
	{
		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, this.options.blockSize, subKeys);
	}

}

class Rc5Transform extends Rc5BaseTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("rounds", "Rounds", 12, { min: 0, max: 255 })
			.addOption("blockSize", "Block size", 64, { type: "select", texts: BLOCK_SIZES });
	}

	get roundKeyCount()
	{
		return 2 * this.options.rounds + 2;
	}

	get wordSize()
	{
		return this.options.blockSize / 2;
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
		const wordSize = this.wordSize;
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
			a = add(rol(a ^ b, b % wordSize), subKeys[2 * i]);
			b = add(rol(b ^ a, a % wordSize), subKeys[2 * i + 1]);
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
		const wordSize = this.wordSize;
		const rounds = this.options.rounds;

		let [a, b] = bytesToInt32sLE(block);

		for (let i = rounds; i >= 1; i--)
		{
			b = ror(add(b, -subKeys[2 * i + 1]), a % wordSize) ^ a;
			a = ror(add(a, -subKeys[2 * i]), b % wordSize) ^ b;
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