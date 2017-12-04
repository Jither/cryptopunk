import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt16sBE, bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { gfMul } from "../../cryptopunk.galois";

const ROUNDS_PER_LEVEL = 16;

const SMOD = [
	333, 313, 505, 369,
	379, 375, 319, 391,
	361, 445, 451, 397,
	397, 425, 395, 505
];

const SXOR = [
	0x83, 0x85, 0x9b, 0xcd,
	0xcc, 0xa7, 0xad, 0x41,
	0x4b, 0x2e, 0xd4, 0x33,
	0xea, 0xcb, 0x2e, 0x04
];

const PBOX = [
	0x00000001, 0x00000080, 0x00000400, 0x00002000,
	0x00080000, 0x00200000, 0x01000000, 0x40000000,
	0x00000008, 0x00000020, 0x00000100, 0x00004000,
	0x00010000, 0x00800000, 0x04000000, 0x20000000,
	0x00000004, 0x00000010, 0x00000200, 0x00008000,
	0x00020000, 0x00400000, 0x08000000, 0x10000000,
	0x00000002, 0x00000040, 0x00000800, 0x00001000,
	0x00040000, 0x00100000, 0x02000000, 0x80000000
];

const KEY_ROTATION = [
	0, 1, 2, 3, 2, 1, 3, 0,
	1, 3, 2, 0, 3, 1, 0, 2
];

let SBOX_1, SBOX_2, SBOX_3, SBOX_4;

// TODO: Consider using a * b = 2^(log2(a) + log2(b)) for this
function gfPow7(b, m)
{
	if (b === 0)
	{
		return 0;
	}

	let x = gfMul(b, b, m);
	x = gfMul(b, x, m);
	x = gfMul(x, x, m);
	x = gfMul(b, x, m);
	return x;
}

function permutate(x)
{
	let result = 0;
	let pIndex = 0;
	while (x !== 0)
	{
		if (x & 1)
		{
			result |= PBOX[pIndex];
		}
		pIndex++;
		x >>>= 1;
	}

	return result;
}

function precompute()
{
	if (SBOX_1)
	{
		return;
	}

	SBOX_1 = new Array(1024);
	SBOX_2 = new Array(1024);
	SBOX_3 = new Array(1024);
	SBOX_4 = new Array(1024);

	for (let i = 0; i < 1024; i++)
	{
		const col = (i >>> 1) & 0xff;
		const row = (i & 1) | ((i & 0x200) >>> 8);
		let x;

		x = gfPow7(col ^ SXOR[row     ], SMOD[row     ]) << 24;
		SBOX_1[i] = permutate(x);

		x = gfPow7(col ^ SXOR[row +  4], SMOD[row +  4]) << 16;
		SBOX_2[i] = permutate(x);

		x = gfPow7(col ^ SXOR[row +  8], SMOD[row +  8]) << 8;
		SBOX_3[i] = permutate(x);

		x = gfPow7(col ^ SXOR[row + 12], SMOD[row + 12]);
		SBOX_4[i] = permutate(x);
	}
}

function f(p, subKey)
{
	const tl = ((p >>> 16) & 0x03ff) | (((p >>> 14) | (p << 18)) & 0x0ffc00);
	const tr = (p & 0x03ff) | ((p << 2) & 0x0ffc00);

	let al = subKey[2] & (tl ^ tr);
	let ar = al ^ tr;
	al ^= tl;

	al ^= subKey[0];
	ar ^= subKey[1];

	return SBOX_1[al >>> 10] | SBOX_2[al & 0x03ff] | SBOX_3[ar >>> 10] | SBOX_4[ar & 0x03ff];
}

class IceTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("level", "Level", 1, { min: 0 });
	}

	get levelName()
	{
		const level = this.options.level;
		if (level < 1)
		{
			return "ThinICE";
		}
		return "ICE-" + level;
	}

	get rounds()
	{
		const level = this.options.level;
		if (level < 1)
		{
			return 8;
		}
		return level * ROUNDS_PER_LEVEL;
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, (this.options.level || 1) * 64);

		const subKeys = this.generateSubKeys(keyBytes, this.options.level);

		return this.transformBlocks(bytes, 64, subKeys);
	}

	generateSubKeys(keyBytes, level)
	{
		precompute();
		const rounds = this.rounds;

		const subKeys = new Array(rounds);

		if (level < 1)
		{
			// ThinICE
			const keyWords = bytesToInt16sBE(keyBytes);
			this.buildKeySchedule(subKeys, keyWords, 0, 0);
			return subKeys;
		}

		// ICE-n
		const keyWords = bytesToInt16sBE(keyBytes);
		for (let i = 0; i < level; i++)
		{
			const kw = keyWords.slice(i * 4, i * 4 + 4);
			this.buildKeySchedule(subKeys, kw, i * 8, 0);
			this.buildKeySchedule(subKeys, kw, rounds - 8 - i * 8, 8);
		}

		return subKeys;
	}

	buildKeySchedule(subKeys, keyWords, n, keyRotationIndex)
	{
		for (let i = 0; i < 8; i++)
		{
			const kr = KEY_ROTATION[keyRotationIndex + i];
			const subKey = subKeys[n + i] = new Array(3);

			subKey.fill(0);

			for (let j = 0; j < 15; j++)
			{
				const skIndex = j % 3;

				for (let k = 0; k < 4; k++)
				{
					const kwIndex = 3 - ((kr + k) & 3);
					const kw = keyWords[kwIndex];
					const bit = kw & 1;

					subKey[skIndex] = (subKey[skIndex] << 1) | bit;
					keyWords[kwIndex] = (kw >>> 1) | ((bit ^ 1) << 15);
				}
			}
		}
	}
}

class IceEncryptTransform extends IceTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const rounds = this.rounds;

		let [left, right] = bytesToInt32sBE(block);

		for (let i = 0; i < rounds; i += 2)
		{
			left ^= f(right, subKeys[i]);
			right ^= f(left, subKeys[i + 1]);
		}

		dest.set(int32sToBytesBE([right, left]), destOffset);
	}
}

class IceDecryptTransform extends IceTransform
{
	constructor()
	{
		super(true);
	}
	
	transformBlock(block, dest, destOffset, subKeys)
	{
		const rounds = this.rounds;

		let [left, right] = bytesToInt32sBE(block);

		for (let i = rounds - 1; i > 0; i -= 2)
		{
			left ^= f(right, subKeys[i]);
			right ^= f(left, subKeys[i - 1]);
		}

		dest.set(int32sToBytesBE([right, left]), destOffset);
	}
}

export {
	IceEncryptTransform,
	IceDecryptTransform
};