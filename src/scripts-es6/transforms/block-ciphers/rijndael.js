import { BlockCipherTransform } from "./block-cipher";
import { TransformError } from "../transforms";
import { bytesToInt32sBE, checkSize } from "../../cryptopunk.utils";
import { mod } from "../../cryptopunk.math";

// Pure implementation of Rijndael (AES) allowing
// experimentation without modes of operation etc.
// Also supports:
// - the higher block sizes of Rijndael: 160, 192, 224, 256
// - additional specified key sizes: 160, 224
// - 2-20 rounds

const KEY_SIZES = [128, 160, 192, 224, 256];
const BLOCK_SIZES = [128, 160, 192, 224, 256];
const ROUND_COUNTS = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const ROUND_COUNT_NAMES = ["Recommended", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"];

// FIPS-recommended round counts by key size - or block size. The highest key/block size decides
const RECOMMENDED_ROUND_COUNTS = {
	128: 10,
	160: 11,
	192: 12,
	224: 13,
	256: 14
};


const ROUND_CONSTANTS = [
	0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 
	0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91, 0x39, 
	0x72, 0xe4, 0xd3, 0xbd, 0x61, 0xc2, 0x9f, 0x25, 0x4a, 0x94, 0x33, 0x66, 0xcc, 0x83, 0x1d, 0x3a
];

// Substitution box
const S_BOX = [];
// Inverse Substitution box
const SI_BOX = [];
// Precalculated MixColumns lookup tables (Rijndael finite field arithmetic)
const ENC_T1 = [], ENC_T2 = [], ENC_T3 = [], ENC_T4 = [];
// Precalculated InvMixColumns lookup tables (Rijndael finite field arithmetic)
const DEC_T5 = [], DEC_T6 = [], DEC_T7 = [], DEC_T8 = [];

// Precalculates s-boxes and transformation tables
function precompute()
{
	if (S_BOX.length > 0)
	{
		// Already calculated
		return;
	}

	const
		encTables = [ENC_T1, ENC_T2, ENC_T3, ENC_T4], 
		decTables = [DEC_T5, DEC_T6, DEC_T7, DEC_T8];
	
	const
		a2    = [], // Map of a -> a*{02} in Rijndael field
		a3inv = []; // Map of a*{03} -> a in Rijndael field
	for (let x = 0; x < 256; x++)
	{
		// 0x11b = Rijndael polynomial (x8 + x4 + x3 + x + 1 = {100011011} = {0x11b})
		const x2 = x << 1 ^ (x >> 7) * 0x11b;
		a2[x] = x2;

		a3inv[x2 ^ x] = x;
	}

	// For each iteration, n:
	// - x will be {03}^^n
	// - xInv will be 1/x
	// (both in Rijndael field)
	// {03} is a generator for the Rijndael field, meaning we'll get through all values, 0-255
	let x = 0, xInv = 0;
	while (!S_BOX[x])
	{
		// Compute S-box. The following is equivalent to:
		// xInv XOR ROL(xInv, 1) XOR ROL(xInv, 2) XOR ROL(xInv, 3) XOR ROL(xInv, 4) XOR 0x63
		// We simply shift left (into high byte) rather than rotating, and combine the high byte
		// with the low byte afterwards. Then XOR by 0x63
		let s = xInv ^ (xInv << 1) ^ (xInv << 2) ^ (xInv << 3) ^ (xInv << 4);
		s = (s >> 8) ^ (s & 0xff) ^	0x63;

		S_BOX[x] = s;
		// The Inverse S-box is simply a reverse lookup table:
		SI_BOX[s] = x;

		// Compute MixColumns and InvMixColumns lookups
		const x2 = a2[x];
		const x4 = a2[x2];
		const x8 = a2[x4];
		// s, s, s*3, s*2:
		let tEnc = a2[s] * 0x00000101 ^ s * 0x01010100;
		// si*9, si*13, si*11, si*14:
		let tDec = x8 * 0x01010101 ^ x4 * 0x00010001 ^ x2 * 0x00000101 ^ x * 0x01010100;

		for (let i = 0; i < 4; i++)
		{
			// ROR 8
			tEnc = tEnc << 24 | tEnc >>> 8;
			tDec = tDec << 24 | tDec >>> 8;
			encTables[i][x] = tEnc;
			decTables[i][s] = tDec;
		}
		// Get next x and xInv:
		x ^= x2 || 1;
		xInv = a3inv[xInv] || 1;
	}
}

class RijndaelBaseTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("blockSize", "Block size", 128, { type: "select", texts: BLOCK_SIZES })
			.addOption("rounds", "Rounds", 0, { type: "select", texts: ROUND_COUNT_NAMES, values: ROUND_COUNTS });
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, KEY_SIZES);

		const blockSize = this.options.blockSize;
		const requirement = checkSize(blockSize, BLOCK_SIZES);
		if (requirement)
		{
			throw new TransformError(`Block size must be ${requirement} bits. Was ${blockSize} bits`);
		}

		// Precalculate tables (once, stored for later use)
		precompute();

		const keySize = keyBytes.length * 8;
		const blockSizeBytes = blockSize / 8;

		let roundCount = this.options.rounds;
		if (roundCount === 0)
		{
			// Get recommended round count based on key size or block size (higher size decides):
			roundCount = RECOMMENDED_ROUND_COUNTS[keySize > blockSize ? keySize : blockSize];
		}

		const roundKeys = this.prepareRoundKeys(keyBytes, roundCount, blockSizeBytes / 4);

		return this.transformBlocks(bytes, blockSize, roundKeys);
	}

	transformBlock(block, dest, destOffset, roundKeys)
	{
		const stateSize = block.length / 4;
		const roundCount = roundKeys.length - 1;

		// Get constants specific to encryption/decryption:
		const [BO1, BO2, BO3, T1, T2, T3, T4, sBox] = this.getDirectionSpecific(stateSize);

		const text = bytesToInt32sBE(block);

		// Round 1:
		for (let i = 0; i < stateSize; i++)
		{
			text[i] ^= roundKeys[0][i];
		}

		const temp = new Array(stateSize);

		// Round 2 to (N-1):
		for (let round = 1; round < roundCount; round++)
		{
			for (let index = 0; index < stateSize; index++)
			{
				temp[index] = (
					T1[(text[index                      ] >>> 24) & 0xff] ^
					T2[(text[mod(index + BO1, stateSize)] >>> 16) & 0xff] ^
					T3[(text[mod(index + BO2, stateSize)] >>>  8) & 0xff] ^
					T4[(text[mod(index + BO3, stateSize)]       ) & 0xff] ^
					roundKeys[round][index]
				);
			}
			// Apply result to text
			for (let index = 0; index < stateSize; index++)
			{
				text[index] = temp[index];
			}
		}

		// Round N
		for (let index = 0; index < stateSize; index++)
		{
			const key = roundKeys[roundCount][index];
			const value =
				sBox[text[index                      ] >>> 24 & 0xff] << 24 ^
				sBox[text[mod(index + BO1, stateSize)] >>> 16 & 0xff] << 16 ^
				sBox[text[mod(index + BO2, stateSize)] >>>  8 & 0xff] <<  8 ^
				sBox[text[mod(index + BO3, stateSize)]        & 0xff] ^
				key;

			dest[destOffset++] = value >> 24 & 0xff;
			dest[destOffset++] = value >> 16 & 0xff;
			dest[destOffset++] = value >>  8 & 0xff;
			dest[destOffset++] = value & 0xff;
		}
	}

	prepareRoundKeys(keyBytes, roundCount, stateSize)
	{
		const roundKeys = [];

		for (let i = 0; i < roundCount + 1; i++) // One more round key than number of rounds
		{
			roundKeys.push(new Array(stateSize));
		}

		const roundKeysNeeded = roundKeys.length * stateSize;

		const keyWords = bytesToInt32sBE(keyBytes);
		const keySizeInWords = keyWords.length;

		let roundKeysMade = 0;

		// First round keys = original key:
		for (let i = 0; i < keySizeInWords; i++)
		{
			if (roundKeysMade >= roundKeysNeeded)
			{
				break;
			}
			const index = Math.floor(roundKeysMade / stateSize);
			const roundIndex = this.decrypt ? roundCount - index : index;
			roundKeys[roundIndex][roundKeysMade % stateSize] = keyWords[i];
			roundKeysMade++;
		}

		// Generate remaining round keys
		let roundConstantsIndex = 0;
		while (roundKeysMade < roundKeysNeeded)
		{
			// Get last word of key
			let tt = keyWords[keySizeInWords - 1];
			// ROT 8, then substitute using S_BOX, and XOR left-most byte with round constant
			keyWords[0] ^= (
				(S_BOX[(tt >> 16) & 0xff] << 24) ^
				(S_BOX[(tt >>  8) & 0xff] << 16) ^
				(S_BOX[(tt      ) & 0xff] <<  8) ^
				(S_BOX[(tt >> 24) & 0xff]      ) ^
				(ROUND_CONSTANTS[roundConstantsIndex] << 24)
			);
			roundConstantsIndex++;

			if (keySizeInWords <= 6)
			{
				// 128-192 bit key expansion
				// XOR each int32 with the previous one
				for (let i = 1; i < keySizeInWords; i++)
				{
					keyWords[i] ^= keyWords[i - 1];
				}
			}
			else
			{
				// 224-256 bit key expansion
				for (let i = 1; i < 4; i++)
				{
					keyWords[i] ^= keyWords[i - 1];
				}
				
				tt = keyWords[3];
				keyWords[4] ^= (
					(S_BOX[tt         & 0xff]      ) ^
					(S_BOX[(tt >>  8) & 0xff] <<  8) ^
					(S_BOX[(tt >> 16) & 0xff] << 16) ^
					(S_BOX[(tt >> 24) & 0xff] << 24)
				);

				for (let i = 5; i < keySizeInWords; i++)
				{
					keyWords[i] ^= keyWords[i - 1];
				}
			}

			let i = 0;
			while (i < keySizeInWords && roundKeysMade < roundKeysNeeded)
			{
				const r = Math.floor(roundKeysMade / stateSize);
				const c = roundKeysMade % stateSize;
				const roundIndex = this.decrypt ? roundCount - r : r;
				roundKeys[roundIndex][c] = keyWords[i];
				i++;
				roundKeysMade++;
			}
		}

		// Inverse the round keys for decryption
		if (this.decrypt)
		{
			for (let r = 1; r < roundCount; r++)
			{
				for (let c = 0; c < stateSize; c++)
				{
					const key = roundKeys[r][c];
					roundKeys[r][c] = (
						DEC_T5[S_BOX[key >> 24 & 0xff]] ^
						DEC_T6[S_BOX[key >> 16 & 0xff]] ^
						DEC_T7[S_BOX[key >>  8 & 0xff]] ^
						DEC_T8[S_BOX[key       & 0xff]]
					);
				}
			}
		}

		return roundKeys;
	}
}


class RijndaelEncryptTransform extends RijndaelBaseTransform
{
	constructor()
	{
		super(false);
	}

	getDirectionSpecific(stateSize)
	{
		const result = [
			1, 2, 3,
			ENC_T1, ENC_T2, ENC_T3, ENC_T4, 
			S_BOX
		];
		// Different shift values for 224 and 256 block sizes
		switch (stateSize)
		{
			case 7:
				result[2] = 4;
				break;
			case 8:
				result[1] = 3;
				result[2] = 4;
				break;
		}
		return result;
	}
}

class RijndaelDecryptTransform extends RijndaelBaseTransform
{
	constructor()
	{
		super(true);
	}

	getDirectionSpecific(stateSize)
	{
		const result = [
			-1, -2, -3,
			DEC_T5, DEC_T6, DEC_T7, DEC_T8, 
			SI_BOX
		];

		// Different shift values for 224 and 256 block sizes
		switch (stateSize)
		{
			case 7:
				result[2] = -4;
				break;
			case 8:
				result[1] = -3;
				result[2] = -4;
				break;
		}
		return result;
	}
}

export {
	RijndaelEncryptTransform,
	RijndaelDecryptTransform
};