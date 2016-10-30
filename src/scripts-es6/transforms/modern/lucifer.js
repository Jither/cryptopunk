import { TransformError } from "../transforms";
import { BlockCipherTransform } from "./block-cipher";
import { hexToBytes, bytesToHex } from "../../cryptopunk.utils";

// UNFINISHED!!! Still a lot of confusion around what LUCIFER does and what it doesn't do

const ROUNDS = 16;

// Original
const SBOX_0 = [
	12, 15, 7, 10, 14, 13, 11, 0,
	2, 6, 3, 1, 9, 4, 5, 8
];

const SBOX_1 = [
	7, 2, 14, 9, 3, 11, 0, 4,
	12, 13, 1, 10, 6, 15, 8, 5
];

// Bit level permutation - indicates which bit in key and substituted message byte will be XOR'ed with
// the h0 byte
const PR = [
	2, 5, 4, 0, 3, 1, 7, 6
];

// Byte level permutation - indicates which byte of h0 will be XOR'ed with the key and substituted message bits
const O = [
	7, 6, 2, 1, 5, 0, 3, 4
];

// Remapped for big endian bit order

// Remapped order
/*
const SBOX_0 = [
	12, 2, 14, 9, 7, 3, 11, 5,
	15, 6, 13, 4, 10, 1, 0, 8
];

const SBOX_1 = [
	7, 12, 3, 6, 14, 1, 0, 8,
	2, 13, 11, 15, 9, 10, 4, 5
];
*/
/*
// Remapped order and numbers
const SBOX_0 = [
	3, 4, 7, 9, 14, 12, 13, 10,
	15, 6, 11, 2, 5, 8, 0, 1
];

const SBOX_1 = [
	14, 3, 12, 6, 7, 8, 0, 1,
	4, 11, 13, 15, 9, 5, 2, 10
];
*/

/*
*/
/*
// Remapped numbers
const SBOX_0 = [
	3, 15, 14, 5, 7, 11, 13, 0,
	4, 6, 12, 8, 9, 2, 10, 1
];
const SBOX_1 = [
	14, 4, 7, 9, 12, 13, 0, 2,
	3, 11, 8, 5, 6, 15, 1, 10
];
*/
/*
*/

function log(...rest)
{
	let result = "";
	for (let i = 0; i < rest.length; i++)
	{
		result += ("    " + rest[i]).substr(-4);
	}
	console.log(result);
}

class LuciferTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, 128);

		return this.transformBlocks(bytes, 128, keyBytes);
	}

	transformBlock(block, dest, destOffset, keyBytes)
	{
		let h0 = Uint8Array.from(block.subarray(0, 8));
		let h1 = Uint8Array.from(block.subarray(8));

		// For encryption, kc (starting byte position for the key bytes used for a roun) will
		// follow the order: 0 7 14 5 12 3 10 1 8 15 6 13 4 11 2 9.
		// Starting from 0, and adding 1 for each key byte used, except the last.
		// In other words, 7 has been added by the end of each round.
		// Round 1:           0
		// Round 2:  0 + 7 =  7 (mod 16)
		// Round 3:  7 + 7 = 14 (mod 16)
		// Round 4: 14 + 7 =  5 (mod 16)
		// Etc.
		//
		// Decryption is reversed order, by starting from 8, and adding:
		// - 1 at the beginning of each round (making the starting point 9 for the first round) and
		// - 1 for each key byte used, *including* the last.
		// In other words, 9 in total has been added by the end of each round.
		// Round 1:               9
		// Round 2:  9 + 8 + 1 =  2 (mod 16)
		// Round 3:  2 + 8 + 1 = 11 (mod 16)
		// Round 4: 11 + 8 + 1 =  4 (mod 16)
		// Etc.
		let kc = 0;
		if (this.decrypt)
		{
			// ""
			kc = 8;
		}

		for (let ii = 1; ii <= ROUNDS; ii++)
		{
			if (this.decrypt)
			{
				kc = (kc + 1) % 16;
			}

			let ks = kc;

			console.log("Round", ii, "kc =", kc);

			for (let jj = 0; jj <= 7; jj++)
			{
				let l = 0;
				let h = 0;

				// l and h are ordered least significant bit first - l = 0123 h = 4567
				for (let kk = 0; kk <= 3; kk++)
				{
					l = (l << 1) | ((h1[jj] >> kk) & 1);
				}

				for (let kk = 4; kk <= 7; kk++)
				{
					h = (h << 1) | ((h1[jj] >> kk) & 1);
				}

				// key is read MOST significant bit first - 76543210
				const icb = (keyBytes[ks] >> (7 - jj)) & 1;

				const v = icb ?
					(SBOX_0[h] | (SBOX_1[l] << 4)) :
					(SBOX_0[l] | (SBOX_1[h] << 4));

                log(jj, l, h, v, icb, SBOX_0[l], SBOX_0[h], SBOX_1[l], SBOX_1[h]);

				for (let kk = 0; kk <= 7; kk++)
				{
					const byteIndex = (O[kk] + jj) % 8;
					const keyBit = (keyBytes[kc] >> (7 - PR[kk])) & 1;
					const vBit = (v >> PR[kk]) & 1;
					// XOR v bit and key bit and shift the result to the destination position
					// for XOR'ing with the h0 byte:
					h0[byteIndex] ^= (vBit ^ keyBit) << (7 - kk);
				}

				// "During encryption, the key rotates one step after each key byte is used,
				// except at the end of each round, when it does not advance"
				if (jj < 7 || this.decrypt)
				{
					kc = (kc + 1) % 16;
				}
			}
			let temp = h0;
			h0 = h1;
			h1 = temp;
		}
		dest.set(h1, destOffset);
		dest.set(h0, destOffset + 8);
	}
}

class LuciferEncryptTransform extends LuciferTransform
{
	constructor()
	{
		super(false);
	}
}

class LuciferDecryptTransform extends LuciferTransform
{
	constructor()
	{
		super(true);
	}
}

function test()
{
	let tf = new LuciferEncryptTransform();
	const plain = hexToBytes("00112233445566778899aabbccddeeff");
	const key   = hexToBytes("0123fedc4567ba987654cdef321089ba")
	let result = tf.transform(plain, key);
	console.log(bytesToHex(result));
	tf = new LuciferDecryptTransform();
	result = tf.transform(result, key);
	console.log(bytesToHex(result));
}

test();

export {
	LuciferEncryptTransform,
	LuciferDecryptTransform
};