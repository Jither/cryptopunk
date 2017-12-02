import { BlockCipherTransform } from "./block-cipher";
import { rol16 } from "../../cryptopunk.bitarith";
import { bytesToInt16sLE } from "../../cryptopunk.utils";

const BLOCK_SIZE_VALUES = [
	64,
	128,
	256
];

const BLOCK_SIZE_NAMES = [
	"64 bits",
	"128 bits",
	"256 bits"
];

const SQRT15 = [
	0xdf7b, 0xd629, 0xe9db, 0x362f, 0x5d00, 0xf20f, 0xc3d1, 0x1fd2,
	0x589b, 0x4312, 0x91eb, 0x718e, 0xbf2a, 0x1e7d, 0xb257, 0x77a6,
	0x1654, 0x6b2a, 0x0d9b, 0xa9d3, 0x668f, 0x19be, 0xf855, 0x6d98,
	0x022d, 0xe4e2, 0xd017, 0xea2f, 0x7572, 0xc3b5, 0x1086, 0x480c,
	0x3aa6, 0x9ca0, 0x98f7, 0xd0e4, 0x253c, 0xc901, 0x55f3, 0x9bf4,
	0xf659, 0xd76c
];

const VVSHIFTS = {
	64: 1,
	128: 4,
	256: 11
};

const FULL_WORD_MASKS = {
	64: 0xff,
	128: 0xffff,
	256: 0xffffffff
};

const HALF_WORD_MASKS = {
	64: 0xf,
	128: 0xff,
	256: 0xffff
};

function f1(x6, x5, x4, x3, x2, x1, x0)
{
	return (x6 & x3) ^ (x5 & x1) ^ (x4 & x2) ^ (x1 & x0) ^ x0;
}

function f2(x6, x5, x4, x3, x2, x1, x0)
{
	return (x6 & x4 & x0) ^ (x4 & x3 & x0) ^ (x5 & x2) ^ (x4 & x3) ^ (x4 & x1) ^ (x3 & x0) ^ x1;
}

function f3(x6, x5, x4, x3, x2, x1, x0)
{
	return (x5 & x4 & x0) ^ (x6 & x4) ^ (x5 & x2) ^ (x3 & x0) ^ (x1 & x0) ^ x3;
}

function f4(x6, x5, x4, x3, x2, x1, x0)
{
	return (x6 & x4 & x2 & x0) ^ (x6 & x5) ^ (x4 & x3) ^ (x3 & x2) ^ (x1 & x0) ^ x2;
}

const OPS = [f1, f2, f3, f4];

class SpeedTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("blockSize", "Block size", 128, { type: "select", values: BLOCK_SIZE_VALUES, texts: BLOCK_SIZE_NAMES })
		// TODO: Recommended rounds
			.addOption("rounds", "Rounds", 32, { min: 32, step: 4 });
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, { min: 48, max: 256, step: 16 });

		const blockSize = this.options.blockSize;
		const rounds = this.options.rounds;

		const subKeys = this.generateSubKeys(keyBytes, blockSize, rounds);

		return this.transformBlocks(bytes, this.options.blockSize, subKeys, this.getBlockSizeSpecific(blockSize));
	}

	generateSubKeys(keyBytes, blockSize, rounds)
	{
		const count = rounds * blockSize / 128; // 64 => r/2, 128 => r, 256 => r*2
		
		const keys = bytesToInt16sLE(keyBytes);
		const userKeyLength = keys.length;

		const qOffset = (userKeyLength - 3) * 3;
		let s0 = SQRT15[qOffset],
			s1 = SQRT15[qOffset + 1],
			s2 = SQRT15[qOffset + 2];

		for (let i = userKeyLength; i < count; i++)
		{
			let t = (s2 & s1) ^ (s1 & s0) ^ (s0 & s2);
			t = rol16(t, 5);
			t = (t + s2 + keys[i % userKeyLength]) & 0xffff;
			keys[i] = t;
			s2 = s1; s1 = s0; s0 = t;
		}

		// Convert to keys of word length:
		switch (blockSize)
		{
			case 64:
				// Slight optimization - by iterating backwards we can replace the keys in-place
				for (let i = keys.length - 1; i >= 0; i--)
				{
					// ... but beware of replacing index 0 with the value for 0 * 2 before getting the value for 0 * 2 + 1:
					const k = keys[i];
					keys[i * 2 + 1] = k >>> 8;
					keys[i * 2] = k & 0xff;
				}
				break;
			case 128:
				break;
			case 256:
				for (let i = 0; i < rounds; i++)
				{
					keys[i] = keys[i * 2] | (keys[i * 2 + 1] << 16);
				}
				keys.length = rounds;
				break;
		}
		return keys;
	}

	// Little Endian variable word length
	readWords(block, wordLength)
	{
		const result = new Array(8);
		let blockOffset = 0;
		for (let i = 0; i < 8; i++)
		{
			let word = 0;
			for (let b = 0; b < wordLength; b++)
			{
				word |= block[blockOffset + b] << (b * 8);
			}
			result[i] = word;
			blockOffset += wordLength;
		}
		return result;
	}

	// Little Endian variable word length
	writeWords(dest, destOffset, words, wordLength)
	{
		for (let i = 0; i < words.length; i++)
		{
			const word = words[i];
			for (let b = 0; b < wordLength; b++)
			{
				dest[destOffset++] = word >>> (b * 8);
			}
		}
	}

	getBlockSizeSpecific(blockSize)
	{
		const shift = blockSize / 16;
		const wordSize = blockSize / 8;
		return {
			wordSize,
			wordLength: wordSize / 8,
			shift,
			rot: shift - 1,
			vvshift: VVSHIFTS[blockSize],
			halfWordMask: HALF_WORD_MASKS[blockSize],
			fullWordMask: FULL_WORD_MASKS[blockSize]
		};
	}

	transformBlock(block, dest, destOffset, subKeys, c)
	{
		let [t0, t1, t2, t3, t4, t5, t6, t7] = this.readWords(block, c.wordLength);

		const rounds = this.options.rounds / 4;

		let k = 0;
		for (let pass = 0; pass < 4; pass++)
		{
			const f = OPS[pass];
			for (let r = 0; r < rounds; r++)
			{
				let newT7 = f(t6, t5, t4, t3, t2, t1, t0);
				const vv = (((newT7 >>> c.shift) + newT7) & c.halfWordMask) >>> c.vvshift;
				newT7 = (newT7 >>> vv) | (newT7 << (c.wordSize - vv));
				newT7 += ((t7 >>> c.rot) | (t7 << (c.wordSize - c.rot))) + subKeys[k++];
				newT7 &= c.fullWordMask;
				
				t7 = t6; t6 = t5; t5 = t4; t4 = t3;
				t3 = t2; t2 = t1; t1 = t0; t0 = newT7;
			}
		}

		this.writeWords(dest, destOffset, [t0, t1, t2, t3, t4, t5, t6, t7], c.wordLength);
	}
}

class SpeedEncryptTransform extends SpeedTransform
{
	constructor()
	{
		super(false);
	}
}

class SpeedDecryptTransform extends SpeedTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, subKeys, c)
	{
		let [t0, t1, t2, t3, t4, t5, t6, t7] = this.readWords(block, c.wordLength);

		const rounds = this.options.rounds / 4;

		let k = subKeys.length - 1;
		for (let pass = 3; pass >= 0; pass--)
		{
			const f = OPS[pass];
			for (let r = 0; r < rounds; r++)
			{
				const oldT0 = t0; t0 = t1; t1 = t2; t2 = t3;
				t3 = t4; t4 = t5; t5 = t6; t6 = t7;

				t7 = f(t6, t5, t4, t3, t2, t1, t0) & c.fullWordMask;
				const vv = (((t7 >>> c.shift) + t7) & c.halfWordMask) >>> c.vvshift;
				t7 = (t7 >>> vv) | (t7 << (c.wordSize - vv));
				t7 = (oldT0 - t7 - subKeys[k--]) & c.fullWordMask;
				t7 = (t7 << c.rot) | (t7 >>> (c.wordSize - c.rot));
			}
		}

		this.writeWords(dest, destOffset, [t0, t1, t2, t3, t4, t5, t6, t7], c.wordLength);
	}
}

export {
	SpeedEncryptTransform,
	SpeedDecryptTransform
};
