import { Transform, TransformError } from "../transforms";
import { bytesToInt32sBE, } from "../../cryptopunk.utils";

// Pure implementation of Rijndael (AES) allowing
// experimentation without modes of operation etc.

const KEY_SIZES = [
	128,
	192,
	256
];

// FIPS-recommended round counts by key size
const ROUND_COUNTS = {
	128: 10,
	192: 12,
	256: 14
};

const ROUND_CONSTANTS = [
	0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a,
	0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91
];

// Substitution box
const S_BOX = [];
// Inverse Substitution box
const SI_BOX = [];
// Precalculated Encryption Transformations
const ENC_T1 = [], ENC_T2 = [], ENC_T3 = [], ENC_T4 = [];
// Precalculated Decryption Transformations
const DEC_T5 = [], DEC_T6 = [], DEC_T7 = [], DEC_T8 = [];

// Precalculates s-boxes and transformation tables
function precalculate()
{
	const
		encTables = [ENC_T1, ENC_T2, ENC_T3, ENC_T4], 
		decTables = [DEC_T5, DEC_T6, DEC_T7, DEC_T8];
	
	const th = [], d = [];
	for (let i = 0; i < 256; i++)
	{
		const index = i << 1 ^ (i >> 7) * 0x11b;
		d[i] = index;
		th[index ^ i] = i;
	}

	let x = 0, xInv = 0;
	while (!S_BOX[x])
	{
		// Compute sbox
		let s = xInv ^ 
			(xInv << 1) ^ 
			(xInv << 2) ^ 
			(xInv << 3) ^ 
			(xInv << 4);

		s = (s >> 8) ^
			(s & 0xff) ^
			0x63;

		S_BOX[x] = s;
		SI_BOX[s] = x;

		// Compute mix columns
		const x2 = d[x];
		const x4 = d[x2];
		const x8 = d[x4];
		let tDec = x8 * 0x01010101 ^ x4 * 0x00010001 ^ x2 * 0x00000101 ^ x * 0x01010100;
		let tEnc = d[s] * 0x00000101 ^ s * 0x01010100;

		for (let i = 0; i < 4; i++)
		{
			tEnc = tEnc << 24 ^ tEnc >>> 8;
			tDec = tDec << 24 ^ tDec >>> 8;
			encTables[i][x] = tEnc;
			decTables[i][s] = tDec;
		}
		x ^= x2 || 1;
		xInv = th[xInv] || 1;
	}
}

// TODO: Move to lazy call on first use
precalculate();

class RijndaelBaseTransform extends Transform
{
	constructor(encrypt)
	{
		super();
		this.encrypt = encrypt;
		this.addInput("bytes", encrypt ? "Plaintext" : "Ciphertext")
			.addInput("bytes", "Key")
			.addOutput("bytes", encrypt ? "Ciphertext" : "Plaintext");
	}

	transform(bytes, keyBytes)
	{
		const keySize = keyBytes.length * 8;
		if (KEY_SIZES.indexOf(keySize) < 0)
		{
			throw new TransformError(`Key length must be one of 128, 192 or 256 bits. Was ${keySize} bits`);
		}

		const roundCount = ROUND_COUNTS[keySize];
		const roundKeys = this.prepareRoundKeys(keyBytes, roundCount);

		const blockCount = Math.ceil(bytes.length / 16);
		const result = [];
		for (let index = 0; index < blockCount; index++)
		{
			const startIndex = index * 16;
			const block = bytes.slice(startIndex, startIndex + 16);
			if (block.length < 16)
			{
				// Pad block
				for (let i = block.length; i < 16; i++)
				{
					block.push(0);
				}
			}
			result.push(...this.transformBlock(block, roundKeys));
		}

		return result;
	}

	transformBlock(bytes, roundKeys)
	{
		// Get constants specific to encryption/decryption:
		const [BO1, BO2, BO3, T1, T2, T3, T4, sBox] = this.getDirectionSpecific();
		
		const blockSize = bytes.length * 8;
		if (blockSize !== 128)
		{
			throw new TransformError(`Block size must be 128 bits. Was ${blockSize} bits`);
		}

		const roundCount = roundKeys.length - 1;
		const a = [0, 0, 0, 0];

		let text = bytesToInt32sBE(bytes);

		// Round transform 0:
		for (let i = 0; i < 4; i++)
		{
			text[i] ^= roundKeys[0][i];
		}

		// Round transforms 1 to (N-1):
		for (let round = 1; round < roundCount; round++)
		{
			for (let index = 0; index < 4; index++)
			{
				a[index] = (
					T1[(text[index            ] >> 24) & 0xff] ^
					T2[(text[(index + BO1) % 4] >> 16) & 0xff] ^
					T3[(text[(index + BO2) % 4] >>  8) & 0xff] ^
					T4[(text[(index + BO3) % 4]      ) & 0xff] ^
					roundKeys[round][index]
				);
			}
			text = a.concat(); // Clone
		}

		// Round transform N
		const result = [];
		for (let index = 0; index < 4; index++)
		{
			const key = roundKeys[roundCount][index];
			const value =
				sBox[text[index            ] >> 24 & 0xff] << 24 ^
				sBox[text[(index + BO1) % 4] >> 16 & 0xff] << 16 ^
				sBox[text[(index + BO2) % 4] >>  8 & 0xff] <<  8 ^
				sBox[text[(index + BO3) % 4]       & 0xff] ^
				key;

			result.push(
				value >> 24 & 0xff,
				value >> 16 & 0xff,
				value >>  8 & 0xff,
				value & 0xff
			);
		}

		return result;
	}

	prepareRoundKeys(keyBytes, roundCount)
	{
		const roundKeys = [];

		for (let i = 0; i < roundCount + 1; i++) // One more round key than number of rounds
		{
			roundKeys.push([0,0,0,0]);
		}

		const roundKeysValueCount = roundKeys.length * 4;

		const keyInts = bytesToInt32sBE(keyBytes);
		const keySizeInts = keyInts.length;

		for (let i = 0; i < keySizeInts; i++)
		{
			const index = i >> 2;
			const roundIndex = this.encrypt ? index : roundCount - index;
			roundKeys[roundIndex][i % 4] = keyInts[i];
		}

		let roundConstantsIndex = 0,
			t = keySizeInts;

		while (t < roundKeysValueCount)
		{
			// Get last int32 of key
			let tt = keyInts[keySizeInts - 1];
			// ROT 8, then substitute using S_BOX, and XOR left-most byte with round constant
			keyInts[0] ^= (
				(S_BOX[(tt >> 16) & 0xff] << 24) ^
				(S_BOX[(tt >>  8) & 0xff] << 16) ^
				(S_BOX[(tt      ) & 0xff] <<  8) ^
				(S_BOX[(tt >> 24) & 0xff]      ) ^
				(ROUND_CONSTANTS[roundConstantsIndex] << 24)
			);
			roundConstantsIndex++;

			if (keySizeInts !== 8)
			{
				// 128/192 bit key expansion
				// XOR each int32 with the previous one
				for (let i = 1; i < keySizeInts; i++)
				{
					keyInts[i] ^= keyInts[i - 1];
				}
			}
			else
			{
				// 256 bit key expansion
				const halfKeySizeInts = keySizeInts / 2;
				for (let i = 1; i < halfKeySizeInts; i++)
				{
					keyInts[i] ^= keyInts[i - 1];
				}
				tt = keyInts[halfKeySizeInts - 1];

				keyInts[halfKeySizeInts] ^= (
					(S_BOX[tt         & 0xff]      ) ^
					(S_BOX[(tt >>  8) & 0xff] <<  8) ^
					(S_BOX[(tt >> 16) & 0xff] << 16) ^
					(S_BOX[(tt >> 24) & 0xff] << 24)
				);

				for (let i = halfKeySizeInts + 1; i < keySizeInts; i++)
				{
					keyInts[i] ^= keyInts[i - 1];
				}
			}

			let i = 0;
			while (i < keySizeInts && t < roundKeysValueCount)
			{
				const r = t >> 2;
				const c = t % 4;
				const roundIndex = this.encrypt ? r : roundCount - r;
				roundKeys[roundIndex][c] = keyInts[i];
				i++;
				t++;
			}
		}

		// Inverse the round keys for decryption
		if (!this.encrypt)
		{
			for (let r = 1; r < roundCount; r++)
			{
				for (let c = 0; c < 4; c++)
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
		super(true);
	}

	getDirectionSpecific()
	{
		return [
			1, 2, 3,
			ENC_T1, ENC_T2, ENC_T3, ENC_T4, 
			S_BOX
		];
	}
}

class RijndaelDecryptTransform extends RijndaelBaseTransform
{
	constructor()
	{
		super(false);
	}

	getDirectionSpecific()
	{
		return [
			3, 2, 1,
			DEC_T5, DEC_T6, DEC_T7, DEC_T8, 
			SI_BOX
		];
	}
}

export {
	RijndaelEncryptTransform,
	RijndaelDecryptTransform
};