import { BlockCipherTransform } from "./block-cipher";
import { readNWord, writeNWord } from "../../cryptopunk.utils";
import { add, add64, sub64, xor64, rol64, ror64, rol48, ror48 } from "../../cryptopunk.bitarith";

const BLOCK_SIZES = [
	32,
	48,
	64,
	96,
	128
];

const KEY_SIZES_BY_BLOCK_SIZE = {
	"32": [64],
	"48": [72, 96],
	"64": [96, 128],
	"96": [96, 144],
	"128": [128, 192, 256]
};

const ROUNDS_BY_BLOCK_AND_KEY_SIZE = {
	"32": [22],
	"48": [22, 23],
	"64": [26, 27],
	"96": [28, 29],
	"128": [32, 33, 34]
};

const MASKS = {
	16: 0xffff,
	24: 0xffffff,
	32: 0xffffffff
};

function R(x, y, k, wordSize, rotA, rotB)
{
	const mask = MASKS[wordSize];
	x = ((x >>> rotA) | (x << (wordSize - rotA))) & mask;
	x = add(x, y) & mask;
	x ^= k;
	y = ((y << rotB) | (y >>> (wordSize - rotB))) & mask;
	y ^= x;
	return [x, y];
}

function invR(x, y, k, wordSize, rotA, rotB)
{
	const mask = MASKS[wordSize];
	y ^= x;
	y = ((y >>> rotB) | (y << (wordSize - rotB))) & mask;
	x ^= k;
	x = add(x, -y) & mask;
	x = ((x << rotA) | (x >>> (wordSize - rotA))) & mask;
	return [x, y];
}

// Special case for R48 - the only 64 bit variety that needs special treatment (mask, special rotation)
function R48(x, y, k, wordSize, rotA, rotB)
{
	const mask = 0xffff;

	x = ror48(x, rotA);
	x = add64(x, y); x.hi &= mask;
	x = xor64(x, k);
	y = rol48(y, rotB);
	y = xor64(y, x);
	return [x, y];
}

function invR48(x, y, k, wordSize, rotA, rotB)
{
	const mask = 0xffff;

	y = xor64(y, x);
	y = ror48(y, rotB);
	x = xor64(x, k);
	x = sub64(x, y); x.hi &= mask;
	x = rol48(x, rotA);
	return [x, y];
}

function R64(x, y, k, wordSize, rotA, rotB)
{
	x = ror64(x, rotA);
	x = add64(x, y);
	x = xor64(x, k);
	y = rol64(y, rotB);
	y = xor64(y, x);
	return [x, y];
}

function invR64(x, y, k, wordSize, rotA, rotB)
{
	y = xor64(y, x);
	y = ror64(y, rotB);
	x = xor64(x, k);
	x = sub64(x, y);
	x = rol64(x, rotA);
	return [x, y];
}

class SpeckTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("blockSize", "Block size", 64, { type: "select", texts: BLOCK_SIZES });
	}

	transform(bytes, keyBytes)
	{
		const blockSize = this.options.blockSize;
		this.checkSize("Block size", blockSize, BLOCK_SIZES);

		const validKeySizes = KEY_SIZES_BY_BLOCK_SIZE[blockSize];
		const keySize = this.checkBytesSize("Key", keyBytes, validKeySizes);

		// Round count is based on block size and key size:
		const rounds = ROUNDS_BY_BLOCK_AND_KEY_SIZE[blockSize][validKeySizes.indexOf(keySize)];
		const keys = this.generateRoundKeys(keyBytes, blockSize, rounds);

		return this.transformBlocks(bytes, blockSize, keys, rounds);
	}

	generateRoundKeys(keyBytes, blockSize, rounds)
	{
		const wordSize = blockSize / 2;
		const wordLength = wordSize / 8;
		const wordCount = keyBytes.length  / wordLength;

		const k = new Array(rounds);

		k[0] = readNWord(keyBytes, wordLength * (wordCount - 1), wordLength);

		const l = new Array(wordCount);
		for (let i = 0; i < wordCount - 1; i++)
		{
			l[i] = readNWord(keyBytes, (wordCount - i - 2) * wordLength, wordLength);
		}

		// Choose R implementation based on word size (>32 = 64 bit version)
		let Rfunc;
		switch (wordSize)
		{
			case 48: Rfunc = R48; break;
			case 64: Rfunc = R64; break;
			default: Rfunc = R; break;
		}

		// Special case: 16 bit word size uses different rotations:
		const rotA = wordSize === 16 ? 7 : 8;
		const rotB = wordSize === 16 ? 2 : 3;

		for (let r = 0; r < rounds - 1; r++)
		{
			const roundParam = wordSize <= 32 ? r : { hi: 0, lo: r };
			const lIndex = (r + wordCount - 1) % wordCount;

			let a = l[r % wordCount];
			let b = k[r];

			[a ,b] = Rfunc(a, b, roundParam, wordSize, rotA, rotB);

			l[lIndex] = a;
			k[r + 1] = b;
		}
		return k;
	}

	transformBlock(block, dest, destOffset, keys, rounds)
	{
		const wordLength = block.length / 2;
		// Split into two halves. These may be 24-64 bits (3-8 bytes) depending on block size
		let x = readNWord(block, 0, wordLength);
		let y = readNWord(block, wordLength, wordLength);

		const wordSize = wordLength * 8;

		// Choose R implementation based on word size (>32 = 64 bit version)
		let Rfunc, invRfunc;
		switch (wordSize)
		{
			case 48: Rfunc = R48; invRfunc = invR48; break;
			case 64: Rfunc = R64; invRfunc = invR64; break;
			default: Rfunc = R; invRfunc = invR; break;
		}

		// Special case: 16 bit word size uses different rotations:
		const rotA = wordSize === 16 ? 7 : 8;
		const rotB = wordSize === 16 ? 2 : 3;

		if (this.decrypt)
		{
			// Decryption is simply reversed keys and reversed operation order
			for (let r = rounds - 1; r >= 0; r--)
			{
				[x, y] = invRfunc(x, y, keys[r], wordSize, rotA, rotB);
			}
		}
		else
		{
			for (let r = 0; r < rounds; r++)
			{
				[x, y] = Rfunc(x, y, keys[r], wordSize, rotA, rotB);
			}
		}

		writeNWord(dest, destOffset, x, wordLength);
		writeNWord(dest, destOffset + wordLength, y, wordLength);
	}
}

class SpeckEncryptTransform extends SpeckTransform
{
	constructor()
	{
		super(false);
	}
}

class SpeckDecryptTransform extends SpeckTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	SpeckEncryptTransform,
	SpeckDecryptTransform
};