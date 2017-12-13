import { BlockCipherTransform } from "./block-cipher";
import { SBOX_ENC, SBOX_DEC} from "./shark-square_shared";
import { gfLog2Tables256 } from "../../cryptopunk.galois";
import { xorBytes } from "../../cryptopunk.bitarith";

const ROUNDS = 6;
const ROUND_KEYS = ROUNDS + 1;

// TODO: Align this more with Rijndael
// TODO: SHARK Affine

const SHARK_POLYNOMIAL = 0x1f5;

const G = [
	0xce, 0x95, 0x57, 0x82, 0x8a, 0x19, 0xb0, 0x01, 
	0xe7, 0xfe, 0x05, 0xd2, 0x52, 0xc1, 0x88, 0xf1, 
	0xb9, 0xda, 0x4d, 0xd1, 0x9e, 0x17, 0x83, 0x86, 
	0xd0, 0x9d, 0x26, 0x2c, 0x5d, 0x9f, 0x6d, 0x75, 
	0x52, 0xa9, 0x07, 0x6c, 0xb9, 0x8f, 0x70, 0x17, 
	0x87, 0x28, 0x3a, 0x5a, 0xf4, 0x33, 0x0b, 0x6c, 
	0x74, 0x51, 0x15, 0xcf, 0x09, 0xa4, 0x62, 0x09, 
	0x0b, 0x31, 0x7f, 0x86, 0xbe, 0x05, 0x83, 0x34
];

const G_INV = [
	0xe7, 0x30, 0x90, 0x85, 0xd0, 0x4b, 0x91, 0x41, 
	0x53, 0x95, 0x9b, 0xa5, 0x96, 0xbc, 0xa1, 0x68, 
	0x02, 0x45, 0xf7, 0x65, 0x5c, 0x1f, 0xb6, 0x52, 
	0xa2, 0xca, 0x22, 0x94, 0x44, 0x63, 0x2a, 0xa2, 
	0xfc, 0x67, 0x8e, 0x10, 0x29, 0x75, 0x85, 0x71, 
	0x24, 0x45, 0xa2, 0xcf, 0x2f, 0x22, 0xc1, 0x0e, 
	0xa1, 0xf1, 0x71, 0x40, 0x91, 0x27, 0x18, 0xa5, 
	0x56, 0xf4, 0xaf, 0x32, 0xd2, 0xa4, 0xdc, 0x71, 
];

let LOG2, EXP2;
let TEMP_KEYS;

// TODO: Find a nice way to move this into cryptopunk.galois
// Not using GF multiply lookup tables here, since a and b are arbitrary values
// Instead, we use the fact that:
// a * b = 2^(log2(a) + log2(b))
function gfMul(a, b)
{
	if (a === 0 || b === 0)
	{
		return 0;
	}
	return EXP2[(LOG2[a] + LOG2[b]) % 255];
}

function precomputeTempKeys()
{
	TEMP_KEYS = new Array(ROUND_KEYS);

	for (let i = 0; i < ROUND_KEYS; i++)
	{
		const tempKey = TEMP_KEYS[i] = new Uint8Array(8);
		for (let k = 0; k < 8; k++)
		{
			tempKey[k] = gfMul(SBOX_ENC[i], G[k * 8]);
		}
	}
	invMix(TEMP_KEYS[ROUNDS]);
}

// Same as SQUARE (except OFFSETS not used)
function precompute()
{
	if (LOG2)
	{
		return;
	}

	[LOG2, EXP2] = gfLog2Tables256(SHARK_POLYNOMIAL);

	precomputeTempKeys();
}

function subBytes(state)
{
	for (let i = 0; i < 8; i++)
	{
		state[i] = SBOX_ENC[state[i]];
	}
}

function invSubBytes(state)
{
	for (let i = 0; i < 8; i++)
	{
		state[i] = SBOX_DEC[state[i]];
	}
}

function mix(state)
{
	const b = new Uint8Array(8); // Uint8Array.from(state);

	for (let row = 0; row < 8; row++)
	{
		const a = state[row];
		for (let col = 0; col < 8; col++)
		{
			b[col] ^= gfMul(a, G[col * 8 + row]);
		}
	}
	state.set(b);
}

function invMix(state)
{
	const b = new Uint8Array(8); // Uint8Array.from(state);

	for (let row = 0; row < 8; row++)
	{
		const a = state[row];
		for (let col = 0; col < 8; col++)
		{
			b[col] ^= gfMul(a, G_INV[col * 8 + row]);
		}
	}
	state.set(b);
}

class SharkTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, 128);

		precompute();

		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 64, subKeys);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		const state = Uint8Array.from(block);

		this.encrypt(state, keys);

		dest.set(state, destOffset);
	}

	encrypt(state, keys)
	{
		for (let r = 0; r < ROUNDS - 1; r++)
		{
			const key = keys[r];
			
			// AddKey
			xorBytes(state, key);

			// SubBytes
			subBytes(state);
			mix(state);
		}

		xorBytes(state, keys[ROUNDS - 1]);
		subBytes(state);
		xorBytes(state, keys[ROUNDS]);
	}

	generateSubKeys(keyBytes)
	{
		const keyWords = new Array(ROUND_KEYS);

		// Initial keys = alternating high and low 64-bit words
		for (let r = 0; r < ROUND_KEYS; r++)
		{
			keyWords[r] = r % 2 === 0 ? keyBytes.subarray(0, 8) : keyBytes.subarray(8, 16);
		}

		// Generate encryption keys by encrypting the user key words in Cipher FeedBack mode, with:
		// - The temporary keys
		// - Null IV 
		const keys = new Array(ROUND_KEYS);
		
		const iv = new Uint8Array(8);
		for (let r = 0; r < ROUND_KEYS; r++)
		{
			this.encrypt(iv, TEMP_KEYS);
			const keyWord = keyWords[r];
			xorBytes(iv, keyWord);
			keys[r] = Uint8Array.from(iv);
		}
		// Transform the last key:
		invMix(keys[ROUNDS]);

		return keys;
	}
}

class SharkEncryptTransform extends SharkTransform
{
	constructor()
	{
		super(false);
	}
}

class SharkDecryptTransform extends SharkTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, keys)
	{
		const state = Uint8Array.from(block);

		for (let r = 0; r < ROUNDS - 1; r++)
		{
			const key = keys[r];
			
			// AddKey
			xorBytes(state, key);

			// SubBytes
			invSubBytes(state);
			invMix(state);
		}

		xorBytes(state, keys[ROUNDS - 1]);
		invSubBytes(state);
		xorBytes(state, keys[ROUNDS]);
	
		dest.set(state, destOffset);
	}

	generateSubKeys(keyBytes)
	{
		const keys = super.generateSubKeys(keyBytes);
		// Decryption uses reverse key order
		// and transforms the "middle" keys
		keys.reverse();

		for (let r = 1; r < ROUNDS; r++)
		{
			invMix(keys[r]);
		}

		return keys;
	}
}

export {
	SharkEncryptTransform,
	SharkDecryptTransform
};