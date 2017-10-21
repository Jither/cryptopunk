import { BlockCipherTransform } from "./block-cipher";
import { TransformError } from "../transforms";
import { checkSize, readNWord, writeNWord } from "../../cryptopunk.utils";
import { and64, not64, xor64, ror16, ror24, ror, ror48, ror64, rol16, rol24, rol, rol48, rol64, ONE_64, ZERO_64 } from "../../cryptopunk.bitarith";

const BLOCK_SIZES = [
	32,
	48,
	64,
	96,
	128
];

const
	z0 = "11111010001001010110000111001101111101000100101011000011100110",
	z1 = "10001110111110010011000010110101000111011111001001100001011010",
	z2 = "10101111011100000011010010011000101000010001111110010110110011",
	z3 = "11011011101011000110010111100000010010001010011100110100001111",
	z4 = "11010001111001101011011000100000010111000011001010010011101111";

const KEY_SIZES_BY_BLOCK_SIZE = {
	"32": [64],
	"48": [72, 96],
	"64": [96, 128],
	"96": [96, 144],
	"128": [128, 192, 256]
};

const ROUNDS_BY_BLOCK_AND_KEY_SIZE = {
	"32": [32],
	"48": [36, 36],
	"64": [42, 44],
	"96": [52, 54],
	"128": [68, 69, 72]
};

const Z_BY_BLOCK_AND_KEY_SIZE = {
	"32": [z0],
	"48": [z0, z1],
	"64": [z2, z3],
	"96": [z2, z3],
	"128": [z2, z3, z4]
};

// Main key schedule functions for 16-64 bits:
function K16(k, wordCount, rounds, z)
{
	for (let r = wordCount; r < rounds; r++)
	{
		let temp = ror16(k[r - 1], 3);
		if (wordCount === 4)
		{
			temp ^= k[r - 3];
		}
		temp ^= ror16(temp, 1);

		const source = r - wordCount;
		k[r] = (~k[source] ^ temp ^ z[source % 62] ^ 3) & 0xffff;
	}
}

function K24(k, wordCount, rounds, z)
{
	for (let r = wordCount; r < rounds; r++)
	{
		let temp = ror24(k[r - 1], 3);
		if (wordCount === 4)
		{
			temp ^= k[r - 3];
		}
		temp ^= ror24(temp, 1);

		const source = r - wordCount;
		k[r] = (~k[source] ^ temp ^ z[source % 62] ^ 3) & 0x00ffffff;
	}
}

function K32(k, wordCount, rounds, z)
{
	for (let r = wordCount; r < rounds; r++)
	{
		let temp = ror(k[r - 1], 3);
		if (wordCount === 4)
		{
			temp ^= k[r - 3];
		}
		temp ^= ror(temp, 1);

		const source = r - wordCount;
		k[r] = ~k[source] ^ temp ^ z[source % 62] ^ 3;
	}
}

function K48(k, wordCount, rounds, z)
{
	const MASK48 = { lo: 0xffffffff, hi: 0x0000ffff };
	const CONSTANT = { lo: 3, hi: 0 };

	for (let r = wordCount; r < rounds; r++)
	{
		let temp = ror48(k[r - 1], 3);
		if (wordCount === 4)
		{
			temp = xor64(temp, k[r - 3]);
		}
		temp = xor64(temp, ror48(temp, 1));

		const source = r - wordCount;
		const zValue = z[source % 62] ? ONE_64 : ZERO_64;
		k[r] = and64(xor64(not64(k[source]), temp, zValue, CONSTANT), MASK48);
	}
}

function K64(k, wordCount, rounds, z)
{
	const CONSTANT = { lo: 3, hi: 0 };

	for (let r = wordCount; r < rounds; r++)
	{
		let temp = ror64(k[r - 1], 3);
		if (wordCount === 4)
		{
			temp = xor64(temp, k[r - 3]);
		}
		temp = xor64(temp, ror64(temp, 1));

		const source = r - wordCount;
		const zValue = z[source % 62] ? ONE_64 : ZERO_64;
		k[r] = xor64(not64(k[source]), temp, zValue, CONSTANT);
	}
}

// Main encrypt/decrypt functions for 16-64 bits:
function S16(x, y, keys, rounds)
{
	for (let r = 0; r < rounds; r++)
	{
		const temp = x;
		x = y ^ (rol16(x, 1) & rol16(x, 8)) ^ rol16(x, 2) ^ keys[r];
		y = temp;
	}
	return [x, y];
}

function S24(x, y, keys, rounds)
{
	for (let r = 0; r < rounds; r++)
	{
		const temp = x;
		x = y ^ (rol24(x, 1) & rol24(x, 8)) ^ rol24(x, 2) ^ keys[r];
		y = temp;
	}
	return [x, y];
}

function S32(x, y, keys, rounds)
{
	for (let r = 0; r < rounds; r++)
	{
		const temp = x;
		x = y ^ (rol(x, 1) & rol(x, 8)) ^ rol(x, 2) ^ keys[r];
		y = temp;
	}
	return [x, y];
}

function S48(x, y, keys, rounds)
{
	for (let r = 0; r < rounds; r++)
	{
		const temp = x;
		x = xor64(y, and64(rol48(x, 1), rol48(x, 8)), rol48(x, 2), keys[r]);
		y = temp;
	}
	return [x, y];
}

function S64(x, y, keys, rounds)
{
	for (let r = 0; r < rounds; r++)
	{
		const temp = x;
		x = xor64(y, and64(rol64(x, 1), rol64(x, 8)), rol64(x, 2), keys[r]);
		y = temp;
	}
	return [x, y];
}

const KEY_FUNCS = { 16: K16, 24: K24, 32: K32, 48: K48, 64: K64 };
const S_FUNCS = { 16: S16, 24: S24, 32: S32, 48: S48, 64: S64 };

class SimonTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("blockSize", "Block size", 64, { type: "select", texts: BLOCK_SIZES });
	}

	transform(bytes, keyBytes)
	{
		const blockSize = this.options.blockSize;
		const requirement = checkSize(blockSize, BLOCK_SIZES);
		if (requirement)
		{
			throw new TransformError(`Block size must be ${requirement} bits. Was: ${blockSize} bits.`);
		}
		const validKeySizes = KEY_SIZES_BY_BLOCK_SIZE[blockSize];
		const keySize = this.checkKeySize(keyBytes, validKeySizes);
		const keySizeIndex = validKeySizes.indexOf(keySize);
		// Round count and z is based on block size and key size:
		const rounds = ROUNDS_BY_BLOCK_AND_KEY_SIZE[blockSize][keySizeIndex];
		const z = Z_BY_BLOCK_AND_KEY_SIZE[blockSize][keySizeIndex];
		const keys = this.generateRoundKeys(keyBytes, blockSize, rounds, z);

		return this.transformBlocks(bytes, blockSize, keys, rounds);
	}
	
	generateRoundKeys(keyBytes, blockSize, rounds, zStr)
	{
		const wordSize = blockSize / 2;
		const wordLength = wordSize / 8;
		const wordCount = keyBytes.length / wordLength;

		const K = KEY_FUNCS[wordSize];

		// Convert bit string to bit array:
		const z = zStr.split("").map(bit => parseInt(bit, 10));

		const k = new Array(rounds);
		for (let r = 0; r < wordCount; r++)
		{
			const offset = (wordCount - r - 1) * wordLength;
			k[r] = readNWord(keyBytes, offset, wordLength);
		}

		K(k, wordCount, rounds, z);

		return k;
	}

	transformBlock(block, dest, destOffset, keys, rounds)
	{
		const wordLength = block.length / 2;
		const wordSize = wordLength * 8;
		// Split into two halves. These may be 16-64 bits (2-8 bytes) depending on block size
		let x = readNWord(block, 0, wordLength);
		let y = readNWord(block, wordLength, wordLength);

		const S = S_FUNCS[wordSize];

		if (this.decrypt)
		{
			keys.reverse();
			[x, y] = [y, x];
		}

		[x, y] = S(x, y, keys, rounds);

		if (this.decrypt)
		{
			[x, y] = [y, x];
		}

		writeNWord(dest, destOffset, x, wordLength);
		writeNWord(dest, destOffset + wordLength, y, wordLength);
	}
}

class SimonEncryptTransform extends SimonTransform
{
	constructor()
	{
		super(false);
	}
}

class SimonDecryptTransform extends SimonTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	SimonEncryptTransform,
	SimonDecryptTransform
};