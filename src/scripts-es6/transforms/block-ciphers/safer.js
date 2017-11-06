import { BlockCipherTransform } from "./block-cipher";
import { TransformError } from "../transforms";

const VARIANT_VALUES = [
	"K",
	"SK"
];

const VARIANT_NAMES = [
	"SAFER K",
	"SAFER SK"
];

// Number of rounds is limited by the size of EXP_TABLE (256):
// Key schedule addresses this table, so:
// table index = ROUNDS * 18 + 9 + 8 bits <= 255
// -> ROUNDS <= 13
// (Massey specifies a maximum of 12 rounds)
const ROUND_VALUES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
const ROUND_NAMES = ["Recommended", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"];

const ALLOWED_KEYSIZES = {
	"K": [64, 128],
	"SK": [40, 64, 128]
};

const RECOMMENDED_ROUNDS = {
	"K": {
		64: 6,
		128: 10
	},
	"SK": {
		40: 5,
		64: 8,
		128: 10
	}
};

const EXP_TABLE = [];
const LOG_TABLE = [];

function precompute()
{
	if (EXP_TABLE.length > 0)
	{
		return;
	}

	LOG_TABLE[1] = 0;
	EXP_TABLE[0] = 1;
	for (let i = 1; i < 256; i++)
	{
		EXP_TABLE[i] = ((45 * EXP_TABLE[i - 1]) % 257);
		LOG_TABLE[EXP_TABLE[i]] = i;
	}
	EXP_TABLE[128] = 0;
	LOG_TABLE[0] = 128;
	EXP_TABLE[0] = 1;
}

function mix1(a, key)
{
	a[0] ^= key[0];
	a[1] = (a[1] + key[1]);
	a[2] = (a[2] + key[2]);
	a[3] ^= key[3];
	a[4] ^= key[4];
	a[5] = (a[5] + key[5]);
	a[6] = (a[6] + key[6]);
	a[7] ^= key[7];
}

function mix2(a, key)
{
	a[0] = (a[0] + key[0]);
	a[1] ^= key[1];
	a[2] ^= key[2];
	a[3] = (a[3] + key[3]);
	a[4] = (a[4] + key[4]);
	a[5] ^= key[5];
	a[6] ^= key[6];
	a[7] = (a[7] + key[7]);
}

function unmix1(a, key)
{
	a[0] ^= key[0];
	a[1] = (a[1] - key[1]);
	a[2] = (a[2] - key[2]);
	a[3] ^= key[3];
	a[4] ^= key[4];
	a[5] = (a[5] - key[5]);
	a[6] = (a[6] - key[6]);
	a[7] ^= key[7];
}

function unmix2(a, key)
{
	a[0] = (a[0] - key[0]);
	a[1] ^= key[1];
	a[2] ^= key[2];
	a[3] = (a[3] - key[3]);
	a[4] = (a[4] - key[4]);
	a[5] ^= key[5];
	a[6] ^= key[6];
	a[7] = (a[7] - key[7]);
}

function pht(a, i1, i2)
{
	a[i2] += a[i1];
	a[i1] += a[i2];
}

function phtInv(a, i1, i2)
{
	a[i1] -= a[i2];
	a[i2] -= a[i1];
}

class SaferTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("variant", "Variant", "SK", { type: "select", values: VARIANT_VALUES, texts: VARIANT_NAMES });
		this.addOption("rounds", "Rounds", 0, { type: "select", values: ROUND_VALUES, texts: ROUND_NAMES });
	}

	transform(bytes, keyBytes)
	{
		const variant = this.options.variant;

		this.checkBytesSize("Key", keyBytes, ALLOWED_KEYSIZES[variant]);
		
		precompute();

		const keySize = keyBytes.length * 8;
		
		let rounds = this.options.rounds;
		if (rounds === 0)
		{
			rounds = RECOMMENDED_ROUNDS[variant][keySize];
		}

		const keys = this.generateKeys(keyBytes, rounds);

		return this.transformBlocks(bytes, 64, keys, rounds);
	}

	generateKeys(keyBytes, rounds)
	{
		// SAFER K-64 key schedule reimplemented as K-128
		// Simply using the same 64-bit key for ka and kb results in the same key expansion
		// Also, add an additional byte for the SK "parity" - it won't interfere even if we're using K variant.
		const ka = new Uint8Array(9);
		const kb = new Uint8Array(9);

		let sk40 = false;

		switch (keyBytes.length)
		{
			case 5: // 40 bit user key
				ka.set(keyBytes);
				ka[5] = ka[0] ^ ka[2] ^ 0x81;
				ka[6] = ka[0] ^ ka[3] ^ ka[4] ^ 0x42;
				ka[7] = ka[1] ^ ka[2] ^ ka[4] ^ 0x24;
				ka[8] = ka[1] ^ ka[3] ^ 0x18;
				kb.set(ka);
				sk40 = true;
				break;
			case 8: // 64 bit user key
				ka.set(keyBytes);
				kb.set(ka);
				break;
			case 16: // 128 bit user key
				ka.set(keyBytes.subarray(0, 8));
				kb.set(keyBytes.subarray(8, 16));
				break;
			default:
				throw new TransformError(`Unexpected key length: ${keyBytes.length}.`);
		}
		
		const keyCount = 2 * rounds + 1;
		const keys = new Array(keyCount);

		let k = 0;
		keys[k++] = Uint8Array.from(kb);

		// We include the parity byte, in case we had a 40-bit user key
		// (otherwise the rotation is a noop, since it's still 0)
		for (let i = 0; i < 9; i++)
		{
			// Rotate right 3
			ka[i] = (ka[i] << 5) | (ka[i] >>> 3);
		}

		// Only assign parity bytes, if we didn't already use it (for 40-bit key expansion)
		if (!sk40)
		{
			for (let i = 0; i < 8; i++)
			{
				// Set parity bytes:
				ka[8] ^= ka[i];
				kb[8] ^= kb[i];
			}
		}

		for (let i = 1; i <= rounds; i++)
		{
			const key1 = keys[k++] = new Uint8Array(8);
			const key2 = keys[k++] = new Uint8Array(8);

			for (let j = 0; j < 9; j++)
			{
				// Rotate left 6 - including parity byte
				ka[j] = (ka[j] << 6) | (ka[j] >>> 2);
				kb[j] = (kb[j] << 6) | (kb[j] >>> 2);
			}

			for (let j = 0; j < 8; j++)
			{
				if (this.options.variant === "SK")
				{
					key1[j] = ka[(j + 2 * i - 1) % 9];
					key2[j] = kb[(j + 2 * i) % 9];
				}
				else
				{
					key1[j] = ka[j];
					key2[j] = kb[j]; 
				}
				key1[j] += EXP_TABLE[EXP_TABLE[18 * i + j + 1]];
				key2[j] += EXP_TABLE[EXP_TABLE[18 * i + j + 10]];
			}
		}
	
		if (this.decrypt)
		{
			keys.reverse();
		}

		return keys;
	}
}

class SaferEncryptTransform extends SaferTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, keys, rounds)
	{
		const a = Uint8Array.from(block);

		let k = 0;

		for (let r = 0; r < rounds; r++)
		{
			// Mix key 1
			mix1(a, keys[k++]);

			// Non-linear layer
			a[0] = EXP_TABLE[a[0]];
			a[1] = LOG_TABLE[a[1]];
			a[2] = LOG_TABLE[a[2]];
			a[3] = EXP_TABLE[a[3]];
			a[4] = EXP_TABLE[a[4]];
			a[5] = LOG_TABLE[a[5]];
			a[6] = LOG_TABLE[a[6]];
			a[7] = EXP_TABLE[a[7]];

			// Mix key 2
			mix2(a, keys[k++]);
			
			// Linear layers
			pht(a, 0, 1); pht(a, 2, 3);
			pht(a, 4, 5); pht(a, 6, 7);

			pht(a, 0, 2); pht(a, 4, 6);
			pht(a, 1, 3); pht(a, 5, 7);

			pht(a, 0, 4); pht(a, 1, 5);
			pht(a, 2, 6); pht(a, 3, 7);
			
			let temp;
			temp = a[1]; a[1] = a[4]; a[4] = a[2]; a[2] = temp;
			temp = a[3]; a[3] = a[5]; a[5] = a[6]; a[6] = temp;
		}

		mix1(a, keys[k++]);

		dest.set(a, destOffset);
	}
}

class SaferDecryptTransform extends SaferTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, keys, rounds)
	{
		const a = Uint8Array.from(block);

		let k = 0;

		unmix1(a, keys[k++]);
		
		for (let r = rounds - 1; r >= 0; r--)
		{
			// Linear layers
			let temp;
			temp = a[4]; a[4] = a[1]; a[1] = a[2]; a[2] = temp;
			temp = a[5]; a[5] = a[3]; a[3] = a[6]; a[6] = temp;

			phtInv(a, 0, 4); phtInv(a, 1, 5);
			phtInv(a, 2, 6); phtInv(a, 3, 7);
			
			phtInv(a, 0, 2); phtInv(a, 4, 6);
			phtInv(a, 1, 3); phtInv(a, 5, 7);

			phtInv(a, 0, 1); phtInv(a, 2, 3);
			phtInv(a, 4, 5); phtInv(a, 6, 7);

			// Mix key 2
			unmix2(a, keys[k++]);

			// Non-linear layer
			a[0] = LOG_TABLE[a[0]];
			a[1] = EXP_TABLE[a[1]];
			a[2] = EXP_TABLE[a[2]];
			a[3] = LOG_TABLE[a[3]];
			a[4] = LOG_TABLE[a[4]];
			a[5] = EXP_TABLE[a[5]];
			a[6] = EXP_TABLE[a[6]];
			a[7] = LOG_TABLE[a[7]];
			
			// Mix key 1
			unmix1(a, keys[k++]);
		}

		dest.set(a, destOffset);
	}
}

export {
	SaferEncryptTransform,
	SaferDecryptTransform
};