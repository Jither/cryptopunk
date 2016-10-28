import { TransformError } from "../transforms";
import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE, hexToBytes } from "../../cryptopunk.utils";

// The following tables are different from the usual reference tables - all of them count
// from 0 - i.e. 0 is first bit, 1 is second... A few of them also have other differences, noted below.

// DES's main method is bit permutation. The permutation tables indicate, for each permutation, what bit
// will end up in each position. I.e., for the KEY_PERMUTATION_TABLE, bit 49 will be moved to bit 0,
// bit 42, will be moved to bit 1, bit 35 to bit 2, etc.

// We're working on the 56 bit key rather than on the 64 bit key (in order to allow inputting 56 bit
// keys directly and still use the same method). Hence, rather than 1-based indices into the 64 bit key, 
// these are 0 based indices into the 56 bit key.
const KEY_PERMUTATION = [
	49, 42, 35, 28, 21, 14, 7, 0, 
	50, 43, 36, 29, 22, 15, 8, 1, 
	51, 44, 37, 30, 23, 16, 9, 2, 
	52, 45, 38, 31, 55, 48, 41, 34, 
	27, 20, 13, 6, 54, 47, 40, 33, 
	26, 19, 12, 5, 53, 46, 39, 32, 
	25, 18, 11, 4, 24, 17, 10, 3
];

// Used to compress subkey from 56 to 32 bits
const COMPRESSION_PERMUTATION = [
	13, 16, 10, 23, 0, 4, 2, 27, 
	14, 5, 20, 9, 22, 18, 11, 3, 
	25, 7, 15, 6, 26, 19, 12, 1, 
	40, 51, 30, 36, 46, 54, 29, 39, 
	50, 44, 32, 47, 43, 48, 38, 55, 
	33, 52, 45, 41, 49, 35, 28, 31
];

// This is used to permute the incoming block before doing anything else - it doesn't add anything
// security-wise, but was likely used by the original DES algorithm to ease loading into hardware
const INITIAL_PERMUTATION = [
	57, 49, 41, 33, 25, 17, 9, 1, 
	59, 51, 43, 35, 27, 19, 11, 3, 
	61, 53, 45, 37, 29, 21, 13, 5, 
	63, 55, 47, 39, 31, 23, 15, 7, 
	56, 48, 40, 32, 24, 16, 8, 0, 
	58, 50, 42, 34, 26, 18, 10, 2, 
	60, 52, 44, 36, 28, 20, 12, 4, 
	62, 54, 46, 38, 30, 22, 14, 6
];

// Used to expand right side of block from 32 bits to 48 bits
const EXPANSION_PERMUTATION = [
	31, 0, 1, 2, 3, 4, 3, 4,
	5, 6, 7, 8, 7, 8, 9, 10,
	11, 12, 11, 12, 13, 14, 15, 16, 
	15, 16, 17, 18, 19, 20, 19, 20, 
	21, 22, 23, 24, 23, 24, 25, 26, 
	27, 28, 27, 28, 29, 30, 31, 0
];

// Permutes the bits of the final result of F()
const STRAIGHT_PERMUTATION = [
	15, 6, 19, 20, 28, 11, 27, 16, 
	0, 14, 22, 25, 4, 17, 30, 9, 
	1, 7, 23, 13, 31, 26, 2, 8, 
	18, 12, 29, 5, 21, 10, 3, 24
];

// The reverse of INITIAL_PERMUTATION - and, like it, not a security feature, but a convenience
// for 70's hardware.
const FINAL_PERMUTATION = [
	39, 7, 47, 15, 55, 23, 63, 31, 
	38, 6, 46, 14, 54, 22, 62, 30, 
	37, 5, 45, 13, 53, 21, 61, 29, 
	36, 4, 44, 12, 52, 20, 60, 28, 
	35, 3, 43, 11, 51, 19, 59, 27, 
	34, 2, 42, 10, 50, 18, 58, 26, 
	33, 1, 41, 9, 49, 17, 57, 25, 
	32, 0, 40, 8, 48, 16, 56, 24
];

const SUBKEY_SHIFTS = [
	1, 1, 2, 2, 2, 2, 2, 2, 
	1, 2, 2, 2, 2, 2, 2, 1
];

// S-boxes are remapped to simple substitution of the values 0-63,
// rather than bits 0,5 indicating row and bits 1...4 indicating column.
// Used for non-linear substitution of 6 bits to 4 bits in F() function.
const SBOXES = [
	[
		14, 0, 4, 15, 13, 7, 1, 4, 2, 14, 15, 2, 11, 13, 8, 1,
		3, 10, 10, 6, 6, 12, 12, 11, 5, 9, 9, 5, 0, 3, 7, 8,
		4, 15, 1, 12, 14, 8, 8, 2, 13, 4, 6, 9, 2, 1, 11, 7,
		15, 5, 12, 11, 9, 3, 7, 14, 3, 10, 10, 0, 5, 6, 0, 13,
	],

	[
		15, 3, 1, 13, 8, 4, 14, 7, 6, 15, 11, 2, 3, 8, 4, 14,
		9, 12, 7, 0, 2, 1, 13, 10, 12, 6, 0, 9, 5, 11, 10, 5,
		0, 13, 14, 8, 7, 10, 11, 1, 10, 3, 4, 15, 13, 4, 1, 2,
		5, 11, 8, 6, 12, 7, 6, 12, 9, 0, 3, 5, 2, 14, 15, 9,
	],

	[
		10, 13, 0, 7, 9, 0, 14, 9, 6, 3, 3, 4, 15, 6, 5, 10,
		1, 2, 13, 8, 12, 5, 7, 14, 11, 12, 4, 11, 2, 15, 8, 1,
		13, 1, 6, 10, 4, 13, 9, 0, 8, 6, 15, 9, 3, 8, 0, 7,
		11, 4, 1, 15, 2, 14, 12, 3, 5, 11, 10, 5, 14, 2, 7, 12,
	],

	[
		7, 13, 13, 8, 14, 11, 3, 5, 0, 6, 6, 15, 9, 0, 10, 3,
		1, 4, 2, 7, 8, 2, 5, 12, 11, 1, 12, 10, 4, 14, 15, 9,
		10, 3, 6, 15, 9, 0, 0, 6, 12, 10, 11, 1, 7, 13, 13, 8,
		15, 9, 1, 4, 3, 5, 14, 11, 5, 12, 2, 7, 8, 2, 4, 14,
	],

	[
		2, 14, 12, 11, 4, 2, 1, 12, 7, 4, 10, 7, 11, 13, 6, 1,
		8, 5, 5, 0, 3, 15, 15, 10, 13, 3, 0, 9, 14, 8, 9, 6,
		4, 11, 2, 8, 1, 12, 11, 7, 10, 1, 13, 14, 7, 2, 8, 13,
		15, 6, 9, 15, 12, 0, 5, 9, 6, 10, 3, 4, 0, 5, 14, 3,
	],

	[
		12, 10, 1, 15, 10, 4, 15, 2, 9, 7, 2, 12, 6, 9, 8, 5,
		0, 6, 13, 1, 3, 13, 4, 14, 14, 0, 7, 11, 5, 3, 11, 8,
		9, 4, 14, 3, 15, 2, 5, 12, 2, 9, 8, 5, 12, 15, 3, 10,
		7, 11, 0, 14, 4, 1, 10, 7, 1, 6, 13, 0, 11, 8, 6, 13,
	],

	[
		4, 13, 11, 0, 2, 11, 14, 7, 15, 4, 0, 9, 8, 1, 13, 10,
		3, 14, 12, 3, 9, 5, 7, 12, 5, 2, 10, 15, 6, 8, 1, 6,
		1, 6, 4, 11, 11, 13, 13, 8, 12, 1, 3, 4, 7, 10, 14, 7,
		10, 9, 15, 5, 6, 0, 8, 15, 0, 14, 5, 2, 9, 3, 2, 12,
	],

	[
		13, 1, 2, 15, 8, 13, 4, 8, 6, 10, 15, 3, 11, 7, 1, 4,
		10, 12, 9, 5, 3, 6, 14, 11, 5, 0, 0, 14, 12, 9, 7, 2,
		7, 2, 11, 1, 4, 14, 1, 7, 9, 4, 12, 10, 14, 8, 2, 13,
		0, 15, 6, 12, 10, 9, 13, 0, 15, 3, 3, 5, 5, 6, 8, 11,
	]
];

// TODO: Move into transform
function f(right, subKey)
{
	// Expand right part of block (32 bits) to 48 bits using expansion permutation, 
	// XOR with subkey and substitute each 6 bits to 4 bits using sboxes. That way,
	// we get a 32 bit word back.
	let right32 = 0;
	for (let i = 0; i < 8; i++)
	{
		let e = 0;
		for (let j = 0; j < 6; j++)
		{
			const source = EXPANSION_PERMUTATION[i * 6 + j];
			const mask = 0x80000000 >>> (source % 32);
			e <<= 1;
			e |= (right & mask) ? 1 : 0;
		}
		e ^= subKey[i];
		right32 |= SBOXES[i][e] << (28 - i * 4);
	}

	// Permutate each bit of the 32 bit word (straight permutation)
	let result = 0;
	for (let i = 0; i < 32; i++)
	{
		const source = STRAIGHT_PERMUTATION[i];
		const mask = 0x80000000 >>> (source % 32);
		const bit = (right32 & mask) ? 1 : 0;
		result <<= 1;
		result |= bit;
	}

	return result;
}

class DesTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("checkParity", "Check parity of 64-bit keys", true);
	}

	transform(bytes, keyBytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		switch (keyBytes.length)
		{
			case 7:
				break;
			case 8:
				if (options.checkParity)
				{
					this.checkParity(keyBytes);
				}
				keyBytes = this.stripParity(keyBytes);
				break;
			default:
				throw new TransformError(`Key must be either 56 bits or 64 bits with parity. Was ${keyBytes.length * 8} bits.`);
		}
		const subKeys = this.createSubKeys(keyBytes);

		return this.transformBlocks(bytes, 64, subKeys);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		let [left, right] = bytesToInt32sBE(block);

		// Initial bit permutation - not for security but for 70's hardware
		[left, right] = this.permuteBlock(left, right, INITIAL_PERMUTATION);

		for (let i = 0; i < 16; i++)
		{
			// Only difference between encryption and decryption: Reversed order of sub keys
			const subKey = this.decrypt ? subKeys[15 - i] : subKeys[i];
			// R1 = L0 XOR F(R0, K1)
			// L1 = R0
			const temp = right;
			right = left ^ f(right, subKey);
			left = temp;
		}

		// Final bit permutation - not for security but for 70's hardware.
		// Also swap left/right one last time
		[left, right] = this.permuteBlock(right, left, FINAL_PERMUTATION);

		const result = int32sToBytesBE([left, right]);

		dest.set(result, destOffset);
	}

	stripParity(keyBytes)
	{
		const result = new Uint8Array(7);
		for (let i = 0; i < 7; i++)
		{
			// Remove lsb's of each byte and combine with msb's of next byte
			// aaaaaaaa bbbbbbbb cccccccc ... -> aaaaaaab bbbbbbcc cccccddd ...
			// ... making 7 bytes out of 8.
			result[i] = ((keyBytes[i] & 0xfe) << i) | (keyBytes[i + 1] >> (7 - i));
		}
		return result;
	}

	checkParity(keyBytes)
	{
		for (let i = 0; i < 8; i++)
		{
			let parity = keyBytes[i];
			parity ^= parity >> 4;
			parity ^= parity >> 2;
			parity ^= parity >> 1;
			if ((parity & 1) === 0)
			{
				throw new TransformError(`Parity of each byte of 64 bit key must be odd. Key byte ${i} (value ${keyBytes[i]}) was even.`);
			}
		}
	}

	createSubKeys(keyBytes)
	{
		const result = new Array(16);
		
		// Split 56 key bits into 28 bits left and right, and permutate the bits:
		let left = 0, right = 0;

		for (let i = 0; i < 56; i++)
		{
			const source = KEY_PERMUTATION[i];
			const index = (source / 8) | 0;
			const mask = 0x80 >> (source % 8);
			const bit = (keyBytes[index] & mask) ? 1 : 0;
			if (i < 28)
			{
				left <<= 1;
				left |= bit;
			}
			else
			{
				right <<= 1;
				right |= bit;
			}
		}
		for (let i = 0; i < 16; i++)
		{
			// Rotate the 2*28 bits of subkey pair by 1-2 bits (depending on round)
			const shift = SUBKEY_SHIFTS[i];
			left = (left >> (28 - shift)) | ((left << shift) & 0x0fffffff);
			right = (right >> (28 - shift)) | ((right << shift) & 0x0fffffff);

			// Compression permutation of subkey - 56 bits compressed into 48 bits.
			// We store these as 8 6-bit values (rather than the obvious 6 8-bit values)
			// for ease of use later.
			const subKey = new Uint8Array(8);
			for (let j = 0; j < 48; j++)
			{
				const subKeyIndex = (j / 6) | 0;
				const source = COMPRESSION_PERMUTATION[j];
				const mask = 0x08000000 >> (source % 28);
				const bit = (source < 28 ? left : right ) & mask ? 1 : 0;
				subKey[subKeyIndex] <<= 1;
				subKey[subKeyIndex] |= bit;
			}
			result[i] = subKey;
		}

		return result;
	}

	// Permute block based on permutation table (used for initial and final permutations)
	permuteBlock(left, right, permutation)
	{
		let leftP = 0;
		let rightP = 0;
		for (let i = 0; i < 64; i++)
		{
			const source = permutation[i];
			const mask = 0x80000000 >>> (source % 32);
			const bit = ((source < 32 ? left : right) & mask) ? 1 : 0;
			if (i < 32)
			{
				leftP <<= 1;
				leftP |= bit;
			}
			else
			{
				rightP <<= 1;
				rightP |= bit;
			}
		}
		return [leftP, rightP];
	}
}

class DesEncryptTransform extends DesTransform
{
	constructor()
	{
		super(false);
	}
}

class DesDecryptTransform extends DesTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	DesEncryptTransform,
	DesDecryptTransform
};