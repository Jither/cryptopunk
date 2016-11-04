import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sLE, int32sToBytesLE , int32ToBytesLE, int32ToBytesBE, int32sToHex, bytesToHex, hexToBytes, int32ToHex } from "../../cryptopunk.utils";
import { add, rol, ror } from "../../cryptopunk.bitarith";

const MAX_ROUNDS = 16;
const ROUNDS = 16;
const INPUT_WHITEN = 0;
const OUTPUT_WHITEN = INPUT_WHITEN + 4;
const ROUND_SUBKEYS = OUTPUT_WHITEN + 4;
const TOTAL_SUBKEYS = ROUND_SUBKEYS + 2 * MAX_ROUNDS;
const SK_STEP = 0x02020202;
const SK_BUMP = 0x01010101;
const SK_ROT = 9;
const RS_GF_FDBK = 0x14d;
const MDS_GF_FDBK = 0x169;

const P8x8 = [
	[
		0xa9, 0x67, 0xb3, 0xe8, 0x04, 0xfd, 0xa3, 0x76, 
		0x9a, 0x92, 0x80, 0x78, 0xe4, 0xdd, 0xd1, 0x38, 
		0x0d, 0xc6, 0x35, 0x98, 0x18, 0xf7, 0xec, 0x6c, 
		0x43, 0x75, 0x37, 0x26, 0xfa, 0x13, 0x94, 0x48, 
		0xf2, 0xd0, 0x8b, 0x30, 0x84, 0x54, 0xdf, 0x23, 
		0x19, 0x5b, 0x3d, 0x59, 0xf3, 0xae, 0xa2, 0x82, 
		0x63, 0x01, 0x83, 0x2e, 0xd9, 0x51, 0x9b, 0x7c, 
		0xa6, 0xeb, 0xa5, 0xbe, 0x16, 0x0c, 0xe3, 0x61, 
		0xc0, 0x8c, 0x3a, 0xf5, 0x73, 0x2c, 0x25, 0x0b, 
		0xbb, 0x4e, 0x89, 0x6b, 0x53, 0x6a, 0xb4, 0xf1, 
		0xe1, 0xe6, 0xbd, 0x45, 0xe2, 0xf4, 0xb6, 0x66, 
		0xcc, 0x95, 0x03, 0x56, 0xd4, 0x1c, 0x1e, 0xd7, 
		0xfb, 0xc3, 0x8e, 0xb5, 0xe9, 0xcf, 0xbf, 0xba, 
		0xea, 0x77, 0x39, 0xaf, 0x33, 0xc9, 0x62, 0x71, 
		0x81, 0x79, 0x09, 0xad, 0x24, 0xcd, 0xf9, 0xd8, 
		0xe5, 0xc5, 0xb9, 0x4d, 0x44, 0x08, 0x86, 0xe7, 
		0xa1, 0x1d, 0xaa, 0xed, 0x06, 0x70, 0xb2, 0xd2, 
		0x41, 0x7b, 0xa0, 0x11, 0x31, 0xc2, 0x27, 0x90, 
		0x20, 0xf6, 0x60, 0xff, 0x96, 0x5c, 0xb1, 0xab, 
		0x9e, 0x9c, 0x52, 0x1b, 0x5f, 0x93, 0x0a, 0xef, 
		0x91, 0x85, 0x49, 0xee, 0x2d, 0x4f, 0x8f, 0x3b, 
		0x47, 0x87, 0x6d, 0x46, 0xd6, 0x3e, 0x69, 0x64, 
		0x2a, 0xce, 0xcb, 0x2f, 0xfc, 0x97, 0x05, 0x7a, 
		0xac, 0x7f, 0xd5, 0x1a, 0x4b, 0x0e, 0xa7, 0x5a, 
		0x28, 0x14, 0x3f, 0x29, 0x88, 0x3c, 0x4c, 0x02, 
		0xb8, 0xda, 0xb0, 0x17, 0x55, 0x1f, 0x8a, 0x7d, 
		0x57, 0xc7, 0x8d, 0x74, 0xb7, 0xc4, 0x9f, 0x72, 
		0x7e, 0x15, 0x22, 0x12, 0x58, 0x07, 0x99, 0x34, 
		0x6e, 0x50, 0xde, 0x68, 0x65, 0xbc, 0xdb, 0xf8, 
		0xc8, 0xa8, 0x2b, 0x40, 0xdc, 0xfe, 0x32, 0xa4, 
		0xca, 0x10, 0x21, 0xf0, 0xd3, 0x5d, 0x0f, 0x00, 
		0x6f, 0x9d, 0x36, 0x42, 0x4a, 0x5e, 0xc1, 0xe0
	],
	[
		0x75, 0xf3, 0xc6, 0xf4, 0xdb, 0x7b, 0xfb, 0xc8, 
		0x4a, 0xd3, 0xe6, 0x6b, 0x45, 0x7d, 0xe8, 0x4b, 
		0xd6, 0x32, 0xd8, 0xfd, 0x37, 0x71, 0xf1, 0xe1, 
		0x30, 0x0f, 0xf8, 0x1b, 0x87, 0xfa, 0x06, 0x3f, 
		0x5e, 0xba, 0xae, 0x5b, 0x8a, 0x00, 0xbc, 0x9d, 
		0x6d, 0xc1, 0xb1, 0x0e, 0x80, 0x5d, 0xd2, 0xd5, 
		0xa0, 0x84, 0x07, 0x14, 0xb5, 0x90, 0x2c, 0xa3, 
		0xb2, 0x73, 0x4c, 0x54, 0x92, 0x74, 0x36, 0x51, 
		0x38, 0xb0, 0xbd, 0x5a, 0xfc, 0x60, 0x62, 0x96, 
		0x6c, 0x42, 0xf7, 0x10, 0x7c, 0x28, 0x27, 0x8c, 
		0x13, 0x95, 0x9c, 0xc7, 0x24, 0x46, 0x3b, 0x70, 
		0xca, 0xe3, 0x85, 0xcb, 0x11, 0xd0, 0x93, 0xb8, 
		0xa6, 0x83, 0x20, 0xff, 0x9f, 0x77, 0xc3, 0xcc, 
		0x03, 0x6f, 0x08, 0xbf, 0x40, 0xe7, 0x2b, 0xe2, 
		0x79, 0x0c, 0xaa, 0x82, 0x41, 0x3a, 0xea, 0xb9, 
		0xe4, 0x9a, 0xa4, 0x97, 0x7e, 0xda, 0x7a, 0x17, 
		0x66, 0x94, 0xa1, 0x1d, 0x3d, 0xf0, 0xde, 0xb3, 
		0x0b, 0x72, 0xa7, 0x1c, 0xef, 0xd1, 0x53, 0x3e, 
		0x8f, 0x33, 0x26, 0x5f, 0xec, 0x76, 0x2a, 0x49, 
		0x81, 0x88, 0xee, 0x21, 0xc4, 0x1a, 0xeb, 0xd9, 
		0xc5, 0x39, 0x99, 0xcd, 0xad, 0x31, 0x8b, 0x01, 
		0x18, 0x23, 0xdd, 0x1f, 0x4e, 0x2d, 0xf9, 0x48, 
		0x4f, 0xf2, 0x65, 0x8e, 0x78, 0x5c, 0x58, 0x19, 
		0x8d, 0xe5, 0x98, 0x57, 0x67, 0x7f, 0x05, 0x64, 
		0xaf, 0x63, 0xb6, 0xfe, 0xf5, 0xb7, 0x3c, 0xa5, 
		0xce, 0xe9, 0x68, 0x44, 0xe0, 0x4d, 0x43, 0x69, 
		0x29, 0x2e, 0xac, 0x15, 0x59, 0xa8, 0x0a, 0x9e, 
		0x6e, 0x47, 0xdf, 0x34, 0x35, 0x6a, 0xcf, 0xdc, 
		0x22, 0xc9, 0xc0, 0x9b, 0x89, 0xd4, 0xed, 0xab, 
		0x12, 0xa2, 0x0d, 0x52, 0xbb, 0x02, 0x2f, 0xa9, 
		0xd7, 0x61, 0x1e, 0xb4, 0x50, 0x04, 0xf6, 0xc2, 
		0x16, 0x25, 0x86, 0x56, 0x55, 0x09, 0xbe, 0x91
	]
];

const P_00 = 1, P_01 = 0, P_02 = 0, P_03 = 1, P_04 = 1;
const P_10 = 0, P_11 = 0, P_12 = 1, P_13 = 1, P_14 = 0;
const P_20 = 1, P_21 = 1, P_22 = 0, P_23 = 0, P_24 = 0;
const P_30 = 0, P_31 = 1, P_32 = 1, P_33 = 0, P_34 = 1;

let MDS;

function LFSR1(x)
{
	return (x >> 1) ^ ((x & 0x01) ? MDS_GF_FDBK >> 1 : 0);
}

function LFSR2(x)
{
	return 	(x >> 2) ^ 
			((x & 0x02) ? MDS_GF_FDBK >> 1 : 0) ^ 
			((x & 0x01) ? MDS_GF_FDBK >> 2 : 0);
}

function precompute()
{
	// Precalculate MDS table
	if (MDS)
	{
		return;
	}

	MDS = [
		new Array(256),
		new Array(256),
		new Array(256),
		new Array(256)
	];

	const m1 = [0,0], mX = [0,0], mY = [0,0,0,0];

	for (let i = 0; i < 256; i++)
	{
		m1[0] = P8x8[0][i];
		mX[0] = m1[0] ^ LFSR2(m1[0]);
		mY[0] = m1[0] ^ LFSR1(m1[0]) ^ LFSR2(m1[0]);

		m1[1] = P8x8[1][i];
		mX[1] = m1[1] ^ LFSR2(m1[1]);
		mY[1] = m1[1] ^ LFSR1(m1[1]) ^ LFSR2(m1[1]);

		MDS[0][i] = (m1[P_00]      ) |
					(mX[P_00] <<  8) |
					(mY[P_00] << 16) |
					(mY[P_00] << 24);

		MDS[1][i] = (mY[P_10]      ) |
					(mY[P_10] <<  8) |
					(mX[P_10] << 16) |
					(m1[P_10] << 24);

		MDS[2][i] = (mX[P_20]      ) |
					(mY[P_20] <<  8) |
					(m1[P_20] << 16) |
					(mY[P_20] << 24);

		MDS[3][i] = (mX[P_30]      ) |
					(m1[P_30] <<  8) |
					(mY[P_30] << 16) |
					(mX[P_30] << 24);

	}
}

function f32(x, subKeys, keySize)
{
	// TODO: Should subkeys be byte array? We're constantly unpacking and repacking them as int32
	const b = int32ToBytesLE(x);
	let subKey;

	switch (keySize)
	{
		case 256:
			subKey = subKeys[3];
			b[0] = P8x8[P_04][b[0]] ^ ( subKey        & 0xff);
			b[1] = P8x8[P_14][b[1]] ^ ((subKey >>  8) & 0xff);
			b[2] = P8x8[P_24][b[2]] ^ ((subKey >> 16) & 0xff);
			b[3] = P8x8[P_34][b[3]] ^ ( subKey >> 24);
			// Fall through!
		case 192:
			subKey = subKeys[2];
			b[0] = P8x8[P_03][b[0]] ^ ( subKey        & 0xff);
			b[1] = P8x8[P_13][b[1]] ^ ((subKey >>  8) & 0xff);
			b[2] = P8x8[P_23][b[2]] ^ ((subKey >> 16) & 0xff);
			b[3] = P8x8[P_33][b[3]] ^ ( subKey >> 24);
			// Fall through!
		case 128:
			subKey = subKeys[1];
			b[0] = P8x8[P_02][b[0]] ^ ( subKey        & 0xff);
			b[1] = P8x8[P_12][b[1]] ^ ((subKey >>  8) & 0xff);
			b[2] = P8x8[P_22][b[2]] ^ ((subKey >> 16) & 0xff);
			b[3] = P8x8[P_32][b[3]] ^  (subKey >> 24);

			subKey = subKeys[0];
			b[0] = P8x8[P_01][b[0]] ^ ( subKey        & 0xff);
			b[1] = P8x8[P_11][b[1]] ^ ((subKey >>  8) & 0xff);
			b[2] = P8x8[P_21][b[2]] ^ ((subKey >> 16) & 0xff);
			b[3] = P8x8[P_31][b[3]] ^  (subKey >> 24);
			break;
	}

	// Matrix multiplication via table lookup
	return MDS[0][b[0]] ^ MDS[1][b[1]] ^ MDS[2][b[2]] ^ MDS[3][b[3]];
}

function reedSolomonMDSEncode(k0, k1)
{
	let r = 0;
	for (let i = 0; i < 2; i++)
	{
		r ^= i ? k0 : k1;
		for (let j = 0; j < 4; j++)
		{
			const b = r >>> 24;
			const g2 = ((b << 1) ^ ((b & 0x80) ? RS_GF_FDBK : 0)) & 0xff;
			const g3 = ((b >> 1) & 0x7f) ^ ((b & 1) ? RS_GF_FDBK >> 1 : 0) ^ g2;
			r = (r << 8) ^ (g3 << 24) ^ (g2 << 16) ^ (g3 << 8) ^ b;
		}
	}
	return r;
}

class TwofishTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	generateSubKeys(keyBytes, keySize)
	{
		// Only necessary if we accept non 128/192/256 keys:
		//var keyWordCount64 = Math.floor((keyBytes.length + 63) / 64);
		const keyWords = bytesToInt32sLE(keyBytes);
		const keyWordCount64 = keyBytes.length / 8;
		const subKeyCount = ROUND_SUBKEYS + 2 * ROUNDS;
		const subKeys = new Array(TOTAL_SUBKEYS);
		const sboxKeys = new Array(4);
		const keyWordsEven = new Array(4);
		const keyWordsOdd = new Array(4);

		for (let i = 0; i < keyWordCount64; i++)
		{
			keyWordsEven[i] = keyWords[i * 2];
			keyWordsOdd[i] = keyWords[i * 2 + 1];
			sboxKeys[keyWordCount64 - i - 1] = reedSolomonMDSEncode(keyWordsEven[i], keyWordsOdd[i]);
		}

		for (let i = 0; i < subKeyCount / 2; i++)
		{
			const a = f32(i * SK_STEP, keyWordsEven, keySize);
			let b = f32(i * SK_STEP + SK_BUMP, keyWordsOdd, keySize);
			b = rol(b, 8);
			subKeys[i * 2] = add(a, b);
			subKeys[i * 2 + 1] = rol(add(a, b * 2), SK_ROT);
		}

		return [sboxKeys, subKeys];
	}

	transform(bytes, keyBytes)
	{
		const keySize = this.checkKeySize(keyBytes, [128, 192, 256]);
		precompute();
		const [sboxKeys, subKeys] = this.generateSubKeys(keyBytes, keySize);
		return this.transformBlocks(bytes, 128, subKeys, sboxKeys, keySize);
	}

	transformBlock(block, dest, destOffset, subKeys, sboxKeys, keySize)
	{
		const x = bytesToInt32sLE(block);

		// Whiten
		for (let i = 0; i < x.length; i++)
		{
			x[i] ^= subKeys[i];
		}

		for (let r = 0; r < ROUNDS; r++)
		{
			const t0 = f32(x[0], sboxKeys, keySize);
			const t1 = f32(rol(x[1], 8), sboxKeys, keySize);

			x[3]  = rol(x[3], 1);
			x[2] ^= add(t0, t1, subKeys[ROUND_SUBKEYS + 2 * r]);
			x[3] ^= add(t0, t1 * 2, subKeys[ROUND_SUBKEYS + 2 * r + 1]);
			x[2]  = ror(x[2], 1);

			/* Feistel version
			const rot = Math.floor(r / 2);
			const tRot = Math.floor((r + 1) / 2);
			const t0 = f32(ror(x[0], tRot), sboxKeys, keySize);
			const t1 = f32(rol(x[1], tRot + 8), sboxKeys, keySize);
			x[2] ^= rol(add(t0, t1     , subKeys[ROUND_SUBKEYS + 2 * r    ]), rot);
			x[3] ^= ror(add(t0, t1 << 1, subKeys[ROUND_SUBKEYS + 2 * r + 1]), rot + 1);
			*/

			if (r < ROUNDS - 1)
			{
				// Swap
				let temp = x[0]; x[0] = x[2]; x[2] = temp;
				temp = x[1]; x[1] = x[3]; x[3] = temp;
			}
		}

		/* Feistel version
		x[0] = ror(x[0], 8);
		x[1] = rol(x[1], 8);
		x[2] = ror(x[2], 8);
		x[3] = rol(x[3], 8);
		*/

		// Whiten
		for (let i = 0; i < x.length; i++)
		{
			x[i] ^= subKeys[OUTPUT_WHITEN + i];
		}

		dest.set(int32sToBytesLE(x), destOffset);
	}
}

class TwofishEncryptTransform extends TwofishTransform
{
	constructor()
	{
		super(false);
	}
}

class TwofishDecryptTransform extends TwofishTransform
{
	constructor()
	{
		super(true);
	}

	transformBlock(block, dest, destOffset, subKeys, sboxKeys, keySize)
	{
		const x = bytesToInt32sLE(block);

		// Whiten
		for (let i = 0; i < x.length; i++)
		{
			// Decrypt: Output whiteners instead of input
			x[i] ^= subKeys[i + OUTPUT_WHITEN];
		}

		// Decrypt: Reverse rounds
		for (let r = ROUNDS - 1; r >= 0; r--)
		{
			const t0 = f32(x[0], sboxKeys, keySize);
			const t1 = f32(rol(x[1], 8), sboxKeys, keySize);

			// Decrypt: Only need to swap (x[2] <-> x[3]) and reverse (rol <-> ror) the two rotations here
			x[2]  = rol(x[2], 1);
			x[2] ^= add(t0, t1, subKeys[ROUND_SUBKEYS + 2 * r]);
			x[3] ^= add(t0, t1 * 2, subKeys[ROUND_SUBKEYS + 2 * r + 1]);
			x[3]  = ror(x[3], 1);

			if (r > 0)
			{
				// Swap
				let temp = x[0]; x[0] = x[2]; x[2] = temp;
				temp = x[1]; x[1] = x[3]; x[3] = temp;
			}
		}

		// Decrypt: Use input whiteners instead of output
		for (let i = 0; i < x.length; i++)
		{
			x[i] ^= subKeys[i];
		}

		dest.set(int32sToBytesLE(x), destOffset);
	}
}

export {
	TwofishEncryptTransform,
	TwofishDecryptTransform
};