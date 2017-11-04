import { BlockCipherTransform } from "./block-cipher";
import { int32sToBytesBE } from "../../cryptopunk.utils";
import { gfLog2Tables } from "../../cryptopunk.math";
import { SBOX_ENC, SBOX_DEC} from "./shark-square_shared";

const ROUNDS = 6;
const ROUND_KEYS = ROUNDS + 1;

// TODO: SHARK Affine

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

let CBOX_ENC, CBOX_DEC;
let LOG, ALOG;

function precomputeCboxes(cboxes, sbox, g)
{
	for (let i = 0; i < 8; i++)
	{
		const cbox = cboxes[i] = new Array(512);
		for (let j = 0; j < 256; j++)
		{
			let cboxHi = 0;
			let cboxLo = 0;
			const sboxValue = sbox[j];
			if (sboxValue)
			{
				for (let k = 0; k < 4; k++)
				{
					cboxHi <<= 8;
					cboxHi |= gfMultiply(sboxValue, g[k * 8 + i]);
				}
				for (let k = 4; k < 8; k++)
				{
					cboxLo <<= 8;
					cboxLo |= gfMultiply(sboxValue, g[k * 8 + i]);
				}
			}
			cbox[j * 2] = cboxHi;
			cbox[j * 2 + 1] = cboxLo;
		}
	}
}

// Same as SQUARE (except OFFSETS not used)
function precompute()
{
	if (LOG)
	{
		return;
	}

	[LOG, ALOG] = gfLog2Tables(0x1f5);

	// Since the C-boxes are rather huge, we calculate them here, rather than
	// storing them in the JS
	CBOX_ENC = new Array(8);
	CBOX_DEC = new Array(8);

	precomputeCboxes(CBOX_ENC, SBOX_ENC, G);
	precomputeCboxes(CBOX_DEC, SBOX_DEC, G_INV);
}

function gfMultiply(a, b)
{
	if (a === 0 || b === 0)
	{
		return 0;
	}
	return ALOG[(LOG[a] + LOG[b]) % 255];
}

function transformKey(a)
{
	const
		t = new Uint8Array(8);

	for (let i = 0; i < 8; i++)
	{
		for (let j = 0; j < 8; j++)
		{
			t[i] ^= gfMultiply(G_INV[i * 8 + j], a[j]);
		}
	}

	a.set(t);
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

	crypt(block, keys, sbox, cboxes)
	{
		const result = Uint8Array.from(block);
		const temp = new Uint8Array(8);

		for (let r = 0; r < ROUNDS - 1; r++)
		{
			const key = keys[r];
			for (let i = 0; i < 8; i++)
			{
				result[i] ^= key[i];
			}

			temp.fill(0);
			for (let i = 0; i < 8; i++)
			{
				const cbox = cboxes[i];
				const index = result[i] * 2;
				for (let j = 0; j < 4; j++)
				{
					temp[j] ^= (cbox[index] >>> (24 - 8 * j)) & 0xff;
				}
				for (let j = 4; j < 8; j++)
				{
					temp[j] ^= (cbox[index + 1] >>> (24 - 8 * (j - 4))) & 0xff;
				}
			}
			result.set(temp);
		}

		for (let i = 0; i < 8; i++)
		{
			result[i] ^= keys[ROUNDS - 1][i];
			result[i] = sbox[result[i]];
			result[i] ^= keys[ROUNDS][i];
		}

		return result;
	}

	generateSubKeys(keyBytes)
	{
		const keyWords = new Array(ROUND_KEYS);

		// Initial keys = alternating high and low 64-bit words
		for (let r = 0; r < ROUND_KEYS; r++)
		{
			keyWords[r] = r % 2 === 0 ? keyBytes.subarray(0, 8) : keyBytes.subarray(8, 16);
		}

		// Temporary keys for round key encryption: First values of CBOX 0
		const tempKeys = new Array(ROUND_KEYS);
		for (let r = 0; r < ROUND_KEYS; r++)
		{
			tempKeys[r] = int32sToBytesBE([ CBOX_ENC[0][r * 2], CBOX_ENC[0][r * 2 + 1] ]);
		}
		// ... Except the last one:
		transformKey(tempKeys[ROUNDS]);

		let result = new Array(ROUND_KEYS);

		// Generate encryption keys by encrypting the key words in Cipher FeedBack mode, with:
		// - The temporary keys
		// - Null IV 
		let iv = new Uint8Array(8);
		for (let r = 0; r < ROUND_KEYS; r++)
		{
			iv = this.crypt(iv, tempKeys, SBOX_ENC, CBOX_ENC);
			const keyWord = keyWords[r];
			for (let i = 0; i < 8; i++)
			{
				iv[i] ^= keyWord[i];
			}
			result[r] = iv;
		}
		// Transfrom the last key:
		transformKey(result[ROUNDS]);

		// Decryption uses reverse key order
		// and transforms the "middle" keys
		if (this.decrypt)
		{
			const decryptResult = new Array(ROUND_KEYS);
			decryptResult[0] = result[ROUNDS];
			decryptResult[ROUNDS] = result[0];
			for (let r = 1; r < ROUNDS; r++)
			{
				transformKey(result[ROUNDS - r]);
				decryptResult[r] = result[ROUNDS - r];
			}

			result = decryptResult;
		}

		return result;
	}
}

class SharkEncryptTransform extends SharkTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const result = this.crypt(block, subKeys, SBOX_ENC, CBOX_ENC);
		dest.set(result, destOffset);
	}
}

class SharkDecryptTransform extends SharkTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		const result = this.crypt(block, subKeys, SBOX_DEC, CBOX_DEC);
		dest.set(result, destOffset);
	}
}

export {
	SharkEncryptTransform,
	SharkDecryptTransform
};