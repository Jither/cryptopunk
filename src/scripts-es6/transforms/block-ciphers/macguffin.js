import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt16sLE, int16sToBytesLE, int16sToHex } from "../../cryptopunk.utils";

const ROUNDS = 32;
const ZERO_KEY = [0, 0, 0];

// Each row entry is a bit position: a, a, b, b, c, c
const SBITS = [
	[  2,  5,  6,  9, 11, 13 ],
	[  1,  4,  7, 10,  8, 14 ],
	[  3,  6,  8, 13,  0, 15 ],
	[ 12, 14,  1,  2,  4, 10 ],
	[  0, 10,  3, 14,  6, 12 ],
	[  7,  8, 12, 15,  1,  5 ],
	[  9, 15,  5, 11,  2,  7 ],
	[ 11, 13,  0,  4,  3,  9 ]
];

const SBOXES = [
	[
		2, 0, 0, 3, 3, 1, 1, 0, 0, 2, 3, 0, 3, 3, 2, 1, 1, 2, 2, 0, 0, 2, 2, 3, 1, 3, 3, 1, 0, 1, 1, 2,
		0, 3, 1, 2, 2, 2, 2, 0, 3, 0, 0, 3, 0, 1, 3, 1, 3, 1, 2, 3, 3, 1, 1, 2, 1, 2, 2, 0, 1, 0, 0, 3
	],
	[
		3, 1, 1, 3, 2, 0, 2, 1, 0, 3, 3, 0, 1, 2, 0, 2, 3, 2, 1, 0, 0, 1, 3, 2, 2, 0, 0, 3, 1, 3, 2, 1,
		0, 3, 2, 2, 1, 2, 3, 1, 2, 1, 0, 3, 3, 0, 1, 0, 1, 3, 2, 0, 2, 1, 0, 2, 3, 0, 1, 1, 0, 2, 3, 3
	],
	[
		2, 3, 0, 1, 3, 0, 2, 3, 0, 1, 1, 0, 3, 0, 1, 2, 1, 0, 3, 2, 2, 1, 1, 2, 3, 2, 0, 3, 0, 3, 2, 1,
		3, 1, 0, 2, 0, 3, 3, 0, 2, 0, 3, 3, 1, 2, 0, 1, 3, 0, 1, 3, 0, 2, 2, 1, 1, 3, 2, 1, 2, 0, 1, 2
	],
	[
		1, 3, 3, 2, 2, 3, 1, 1, 0, 0, 0, 3, 3, 0, 2, 1, 1, 0, 0, 1, 2, 0, 1, 2, 3, 1, 2, 2, 0, 2, 3, 3,
		2, 1, 0, 3, 3, 0, 0, 0, 2, 2, 3, 1, 1, 3, 3, 2, 3, 3, 1, 0, 1, 1, 2, 3, 1, 2, 0, 1, 2, 0, 0, 2
	],
	[
		0, 2, 2, 3, 0, 0, 1, 2, 1, 0, 2, 1, 3, 3, 0, 1, 2, 1, 1, 0, 1, 3, 3, 2, 3, 1, 0, 3, 2, 2, 3, 0,
		0, 3, 0, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 0, 2, 3, 3, 0, 3, 3, 2, 0, 1, 3, 0, 2, 1, 0, 0, 1, 2, 1
	],
	[
		2, 2, 1, 3, 2, 0, 3, 0, 3, 1, 0, 2, 0, 3, 2, 1, 0, 0, 3, 1, 1, 3, 0, 2, 2, 0, 1, 3, 1, 1, 3, 2,
		3, 0, 2, 1, 3, 0, 1, 2, 0, 3, 2, 1, 2, 3, 1, 2, 1, 3, 0, 2, 0, 1, 2, 1, 1, 0, 3, 0, 3, 2, 0, 3
	],
	[
		0, 3, 3, 0, 0, 3, 2, 1, 3, 0, 0, 3, 2, 1, 3, 2, 1, 2, 2, 1, 3, 1, 1, 2, 1, 0, 2, 3, 0, 2, 1, 0,
		1, 0, 0, 3, 3, 3, 3, 2, 2, 1, 1, 0, 1, 2, 2, 1, 2, 3, 3, 1, 0, 0, 2, 3, 0, 2, 1, 0, 3, 1, 0, 2
	],
	[
		3, 1, 0, 3, 2, 3, 0, 2, 0, 2, 3, 1, 3, 1, 1, 0, 2, 2, 3, 1, 1, 0, 2, 3, 1, 0, 0, 2, 2, 3, 1, 0,
		1, 0, 3, 1, 0, 2, 1, 1, 3, 0, 2, 2, 2, 2, 0, 3, 0, 3, 0, 2, 2, 3, 3, 0, 3, 1, 1, 1, 1, 0, 2, 3
	]
];

function S(j, a, b, c)
{
	const sbits = SBITS[j];
	const sbox = SBOXES[j];

	const input =
		(((a >>> sbits[0]) & 1)     ) |
		(((a >>> sbits[1]) & 1) << 1) |
		(((b >>> sbits[2]) & 1) << 2) |
		(((b >>> sbits[3]) & 1) << 3) |
		(((c >>> sbits[4]) & 1) << 4) |
		(((c >>> sbits[5]) & 1) << 5);
	
	return sbox[input] << (j * 2);
}

function enc(left, a, b, c, keys)
{
	for (let i = 0; i < ROUNDS; i++)
	{
		const key = keys ? keys[i] : ZERO_KEY;
		let t = 0;
		const ax = a ^ key[0], bx = b ^ key[1], cx = c ^ key[2];
		for (let j = 0; j < 8; j++)
		{
			t |= S(j, ax, bx, cx);
		}
		left ^= t;
		[left, a, b, c] = [a, b, c, left];
	}
	return [left, a, b, c];
}

function dec(left, a, b, c, keys)
{
	for (let i = 0; i < ROUNDS; i++)
	{
		const key = keys[i];
		let t = 0;
		const ax = a ^ key[0], bx = b ^ key[1], cx = c ^ key[2];
		for (let j = 0; j < 8; j++)
		{
			t |= S(j, ax, bx, cx);
		}
		left ^= t;
		[left, a, b, c] = [c, left, a, b];
	}
	return [a, b, c, left];
}

class MacGuffinTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, 128);

		const keys = this.generateKeys(keyBytes);

		return this.transformBlocks(bytes, 64, keys);
	}

	generateKeys(keyBytes)
	{
		const userKey = bytesToInt16sLE(keyBytes);
		const keys = new Array(ROUNDS);
		for (let r = 0; r < ROUNDS; r++)
		{
			keys[r] = [0, 0, 0];
		}
		for (let ukOffset = 0; ukOffset < 8; ukOffset += 4)
		{
			let [left, a, b, c] = userKey.slice(ukOffset, ukOffset + 4);
			for (let r = 0; r < ROUNDS; r++)
			{
				const k = keys[r];
				[left, a, b, c] = enc(left, a, b, c, keys);
				k[0] ^= left;
				k[1] ^= a;
				k[2] ^= b;
			}
		}
		
		return keys;
	}
}

class MacGuffinEncryptTransform extends MacGuffinTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		let [left, a, b, c] = bytesToInt16sLE(block);
		[left, a, b, c] = enc(left, a, b, c, keys);

		dest.set(int16sToBytesLE([left, a, b, c]), destOffset);
	}
}

class MacGuffinDecryptTransform extends MacGuffinTransform
{
	constructor()
	{
		super(true);
	}

	generateKeys(keyBytes)
	{
		const keys = super.generateKeys(keyBytes);
		keys.reverse();
		return keys;
	}


	transformBlock(block, dest, destOffset, keys)
	{
		let [a, b, c, left] = bytesToInt16sLE(block);
		[left, a, b, c] = dec(left, a, b, c, keys);

		dest.set(int16sToBytesLE([left, a, b, c]), destOffset);
	}
}

export {
	MacGuffinEncryptTransform,
	MacGuffinDecryptTransform
};