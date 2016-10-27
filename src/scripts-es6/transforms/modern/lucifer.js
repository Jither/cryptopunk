import { TransformError } from "../transforms";
import { BlockCipherTransform } from "./block-cipher";

// UNFINISHED!!! Still a lot of confusion around what LUCIFER does and what it doesn't do

const ROUNDS = 16;

const SBOX_0 = [
	12, 15, 7, 10, 14, 13, 11, 0,
	2, 6, 3, 1, 9, 4, 5, 8
];

const SBOX_1 = [
	 7, 2, 14, 9, 3, 11, 0, 4,
	12, 13, 1, 10, 6, 15, 8, 5
];

const P = [
	10, 21, 52, 56, 27, 1, 47, 38,
	18, 29, 60, 0, 35, 9, 55, 46,
	26, 37, 4, 8, 43, 17, 63, 54,
	34, 45, 12, 16, 51, 25, 7, 62,
	42, 53, 20, 24, 59, 33, 15, 6,
	50, 61, 28, 32, 3, 41, 23, 14,
	58, 5, 36, 40, 11, 49, 31, 22,
	 2, 13, 44, 48, 19, 57, 39, 30
];

const P_INDEX = [];
const P_MASK = [];

function precompute()
{
	for (let i = 0; i < 64; i++)
	{
		P_INDEX[i] = Math.floor(P[i] / 8);
		P_MASK[i] = 0x01 << (P[i] % 8);
	}
	console.log("P-index", P_INDEX);
	console.log("P-mask", P_MASK);
}

precompute();

class LuciferTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		if (keyBytes.length !== 16)
		{
			throw new TransformError(`Key size must be 128 bits. Was ${keyBytes.length * 8} bits.`);
		}
		return this.transformBlocks(bytes, 128, keyBytes);
	}

	transformBlock(block, dest, destOffset, keyBytes)
	{
		let left = Uint8Array.from(block.subarray(0, 8));
		let right = Uint8Array.from(block.subarray(8));

		const sResult = new Uint8Array(8);
		const pResult = new Uint8Array(8);

		for (let r = 0; r < ROUNDS; r++)
		{
			console.log("left", left);
			console.log("right", right);
			const subKeyIndex = r * 7 % 16;
			// UNCERTAINTY: first or last byte is swap indicator?
			const swap = keyBytes[subKeyIndex];
			for (let i = 0; i < 8; i++)
			{
				// UNCERTAINTY: is swap indicator reused for subkey?
				const x = keyBytes[(subKeyIndex + i) % 16];
				let v = right[i] ^ x;
				//let vms, vls;
				// UNCERTAINTY: Does swapping mean actual swap first, then SBOXes on all nibbles?
				// ... or just whether to use SBOXes?
				let vms = v >> 4;
				let vls = v & 0x0f;
				// UNCERTAINTY: Little or big endian bits?
				if (((swap << i) & 0x80) === 0x80)
				{
					//vms = v & 0x0f;
					//vls = v >> 4;
					vms = SBOX_0[vms];
					vls = SBOX_1[vls];
				}
				/*else
				{
					vms = v >> 4;
					vls = v & 0x0f;
				}*/
				//vms = SBOX_0[vms];
				//vls = SBOX_1[vls];

				sResult[i] = vms << 4 | vls;
			}

			for (let i = 0; i < 8; i++)
			{
				for (let j = 0; j < 8; j++)
				{
					const p = i * 8 + j;
					// UNCERTAINTY: Little or big endian bits?
					pResult[i] >>= 1;
					// UNCERTAINTY: Permutation table indicates source or destination?
					if ((sResult[P_INDEX[p]] & P_MASK[p]) !== 0)
					{
						pResult[i] |= 0x80;
					}
					/*if (((b << j) & 0x80) === 0x80)
					{
						const p = i * 8 + j;
						pResult[P_INDEX[p]] |= P_MASK[p];
					}*/
				}
			}

			for (let i = 0; i < 8; i++)
			{
				left[i] ^= pResult[i];
			}

			// Swap left/right for all but last round:
			if (r < ROUNDS - 1)
			{
				const temp = right;
				right = left;
				left = temp;
			}
		}

		dest.set(left);
		dest.set(right, 8);
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

export {
	LuciferEncryptTransform,
	LuciferDecryptTransform
};