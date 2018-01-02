import { BlockCipherTransform } from "./block-cipher";
import { addBytes, rolBytes, xorBytes, combineBytesLE, splitBytesLE, subBytes, rorBytes } from "../../cryptopunk.bitarith";

// This implementation uses byte arrays for values in order to allow all the supported word lengths.
// See alternative implementation rc5_32-bit-words.js for a simpler 32-bit word size version using plain JS numbers.

const BLOCK_SIZES = [
	32,
	64,
	128
];

// P by word size
// NOTE that these are rounded from e and the golden ratio, and hence the 32 bit P isn't just the first 32 bits of the 64 bit P
// Specifically, the last byte of P32 differs from P64
const P = {
	16: Uint8Array.of(0xb7, 0xe1),
	32: Uint8Array.of(0xb7, 0xe1, 0x51, 0x63),
	64: Uint8Array.of(0xb7, 0xe1, 0x51, 0x62, 0x8a, 0xed, 0x2a, 0x6b)
};

const Q = {
	16: Uint8Array.of(0x9e, 0x37),
	32: Uint8Array.of(0x9e, 0x37, 0x79, 0xb9),
	64: Uint8Array.of(0x9e, 0x37, 0x79, 0xb9, 0x7f, 0x4a, 0x7c, 0x15)
};

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
		// Fill L array with 0 words
		for (let i = 0; i < keyWordCount; i++)
		{
			L[i] = new Uint8Array(wordLength);
		}

		// Populate L array with Little Endian words from key bytes
		let bIndex = 0, kIndex = -1, lIndex = -1;
		let l;
		while (bIndex < keyLength)
		{
			if (lIndex < 0)
			{
				kIndex++;
				l = L[kIndex];
				lIndex = wordLength - 1;
			}
			l[lIndex] = keyBytes[bIndex];
			lIndex--;
			bIndex++;
		}

		const roundKeyCount = this.roundKeyCount;

		// Only use <wordLength> bytes from P and Q
		const PW = P[wordSize];
		const QW = Q[wordSize];

		const S = new Array(roundKeyCount);
		S[0] = Uint8Array.from(PW);

		for (let i = 1; i < roundKeyCount; i++)
		{
			S[i] = Uint8Array.from(S[i - 1]);
			addBytes(S[i], QW);
		}

		let i = 0,
			j = 0;
		const
			a = new Uint8Array(wordLength),
			b = new Uint8Array(wordLength);

		const lastByte = wordLength - 1;

		const keySchedulingCount = Math.max(roundKeyCount, keyWordCount) * 3;

		for (let index = 0; index < keySchedulingCount; index++)
		{
			addBytes(S[i], a, b);
			rolBytes(S[i], 3);
			a.set(S[i]);
			addBytes(L[j], a, b);
			const rotate = (a[lastByte] + b[lastByte]) % wordSize;
			rolBytes(L[j], rotate);
			b.set(L[j]);
			i = (i + 1) % roundKeyCount;
			j = (j + 1) % keyWordCount;
		}

		return S;
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, { min: 0, max: 2040, step: 8 });

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
		const wordLength = wordSize / 8;
		const lastByte = wordLength - 1;
		const rounds = this.options.rounds;

		const [a, b] = splitBytesLE(block, wordLength);
		addBytes(a, subKeys[0]);
		addBytes(b, subKeys[1]);

		for (let i = 1; i <= rounds; i++)
		{
			xorBytes(a, b);
			const rotA = b[lastByte] % wordSize;
			rolBytes(a, rotA);
			addBytes(a, subKeys[2 * i]);

			xorBytes(b, a);
			const rotB = a[lastByte] % wordSize;
			rolBytes(b, rotB);
			addBytes(b, subKeys[2 * i + 1]);
		}

		dest.set(combineBytesLE([a, b]), destOffset);
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
		const wordLength = wordSize / 8;
		const lastByte = wordLength - 1;
		const rounds = this.options.rounds;

		const [a, b] = splitBytesLE(block, wordLength);

		for (let i = rounds; i >= 1; i--)
		{
			subBytes(b, subKeys[2 * i + 1]);
			const rotB = a[lastByte] % wordSize;
			rorBytes(b, rotB);
			xorBytes(b, a);

			subBytes(a, subKeys[2 * i]);
			const rotA = b[lastByte] % wordSize;
			rorBytes(a, rotA);
			xorBytes(a, b);
		}

		subBytes(b, subKeys[1]);
		subBytes(a, subKeys[0]);

		dest.set(combineBytesLE([a, b]), destOffset);
	}
}

export {
	Rc5BaseTransform,
	Rc5EncryptTransform,
	Rc5DecryptTransform
};