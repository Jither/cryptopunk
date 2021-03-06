import { TransformError } from "../transforms";
import { BlockCipherTransform } from "./block-cipher";
import { xorBytes, rorBytes } from "../../cryptopunk.bitarith";
import { hexToBytes } from "../../cryptopunk.utils";
import { getRijndaelSboxes } from "../shared/rijndael";

const
	// First 128x3 bits of the fractional part of 1/PI
	C1 = hexToBytes("517cc1b727220a94fe13abe8fa9a6ee0"),
	C2 = hexToBytes("6db14acc9e21c820ff28b1d5ef5de2b0"),
	C3 = hexToBytes("db92371d2126e9700324977504e8c90e");

const ROUNDS_VALUES = [0, 2, 4, 6, 8, 10, 12, 14, 16];
const ROUNDS_NAMES = ["Recommended", "2", "4", "6", "8", "10", "12", "14", "16"];

// These aren't actually *recommended* rounds - rather, they're part of the spec for each key size.
// However, the algorithms (for v1.0) don't specifically limit us to the given number of rounds.
// TODO: Variant v0.9: 10, 12, 14 rounds
const RECOMMENDED_ROUNDS = {
	128: 12,
	192: 14,
	256: 16
};

// Rijndael S-boxes
let SBOX1, SBOX3;

// Similar to Rijndael S-box, but using:
// x -> (B * x ** 0xf7) ^ 0xe2
// TODO: Calculate
const SBOX2 = [
	0xe2, 0x4e, 0x54, 0xfc, 0x94, 0xc2, 0x4a, 0xcc, 0x62, 0x0d, 0x6a, 0x46, 0x3c, 0x4d, 0x8b, 0xd1,
	0x5e, 0xfa, 0x64, 0xcb, 0xb4, 0x97, 0xbe, 0x2b, 0xbc, 0x77, 0x2e, 0x03, 0xd3, 0x19, 0x59, 0xc1,
	0x1d, 0x06, 0x41, 0x6b, 0x55, 0xf0, 0x99, 0x69, 0xea, 0x9c, 0x18, 0xae, 0x63, 0xdf, 0xe7, 0xbb,
	0x00, 0x73, 0x66, 0xfb, 0x96, 0x4c, 0x85, 0xe4, 0x3a, 0x09, 0x45, 0xaa, 0x0f, 0xee, 0x10, 0xeb,
	0x2d, 0x7f, 0xf4, 0x29, 0xac, 0xcf, 0xad, 0x91, 0x8d, 0x78, 0xc8, 0x95, 0xf9, 0x2f, 0xce, 0xcd,
	0x08, 0x7a, 0x88, 0x38, 0x5c, 0x83, 0x2a, 0x28, 0x47, 0xdb, 0xb8, 0xc7, 0x93, 0xa4, 0x12, 0x53,
	0xff, 0x87, 0x0e, 0x31, 0x36, 0x21, 0x58, 0x48, 0x01, 0x8e, 0x37, 0x74, 0x32, 0xca, 0xe9, 0xb1,
	0xb7, 0xab, 0x0c, 0xd7, 0xc4, 0x56, 0x42, 0x26, 0x07, 0x98, 0x60, 0xd9, 0xb6, 0xb9, 0x11, 0x40,
	0xec, 0x20, 0x8c, 0xbd, 0xa0, 0xc9, 0x84, 0x04, 0x49, 0x23, 0xf1, 0x4f, 0x50, 0x1f, 0x13, 0xdc,
	0xd8, 0xc0, 0x9e, 0x57, 0xe3, 0xc3, 0x7b, 0x65, 0x3b, 0x02, 0x8f, 0x3e, 0xe8, 0x25, 0x92, 0xe5,
	0x15, 0xdd, 0xfd, 0x17, 0xa9, 0xbf, 0xd4, 0x9a, 0x7e, 0xc5, 0x39, 0x67, 0xfe, 0x76, 0x9d, 0x43,
	0xa7, 0xe1, 0xd0, 0xf5, 0x68, 0xf2, 0x1b, 0x34, 0x70, 0x05, 0xa3, 0x8a, 0xd5, 0x79, 0x86, 0xa8,
	0x30, 0xc6, 0x51, 0x4b, 0x1e, 0xa6, 0x27, 0xf6, 0x35, 0xd2, 0x6e, 0x24, 0x16, 0x82, 0x5f, 0xda,
	0xe6, 0x75, 0xa2, 0xef, 0x2c, 0xb2, 0x1c, 0x9f, 0x5d, 0x6f, 0x80, 0x0a, 0x72, 0x44, 0x9b, 0x6c,
	0x90, 0x0b, 0x5b, 0x33, 0x7d, 0x5a, 0x52, 0xf3, 0x61, 0xa1, 0xf7, 0xb0, 0xd6, 0x3f, 0x7c, 0x6d,
	0xed, 0x14, 0xe0, 0xa5, 0x3d, 0x22, 0xb3, 0xf8, 0x89, 0xde, 0x71, 0x1a, 0xaf, 0xba, 0xb5, 0x81,
];

// Actually inverse of SBOX2
const SBOX4 = [
	0x30, 0x68, 0x99, 0x1b, 0x87, 0xb9, 0x21, 0x78, 0x50, 0x39, 0xdb, 0xe1, 0x72, 0x09, 0x62, 0x3c,
	0x3e, 0x7e, 0x5e, 0x8e, 0xf1, 0xa0, 0xcc, 0xa3, 0x2a, 0x1d, 0xfb, 0xb6, 0xd6, 0x20, 0xc4, 0x8d,
	0x81, 0x65, 0xf5, 0x89, 0xcb, 0x9d, 0x77, 0xc6, 0x57, 0x43, 0x56, 0x17, 0xd4, 0x40, 0x1a, 0x4d,
	0xc0, 0x63, 0x6c, 0xe3, 0xb7, 0xc8, 0x64, 0x6a, 0x53, 0xaa, 0x38, 0x98, 0x0c, 0xf4, 0x9b, 0xed,
	0x7f, 0x22, 0x76, 0xaf, 0xdd, 0x3a, 0x0b, 0x58, 0x67, 0x88, 0x06, 0xc3, 0x35, 0x0d, 0x01, 0x8b,
	0x8c, 0xc2, 0xe6, 0x5f, 0x02, 0x24, 0x75, 0x93, 0x66, 0x1e, 0xe5, 0xe2, 0x54, 0xd8, 0x10, 0xce,
	0x7a, 0xe8, 0x08, 0x2c, 0x12, 0x97, 0x32, 0xab, 0xb4, 0x27, 0x0a, 0x23, 0xdf, 0xef, 0xca, 0xd9,
	0xb8, 0xfa, 0xdc, 0x31, 0x6b, 0xd1, 0xad, 0x19, 0x49, 0xbd, 0x51, 0x96, 0xee, 0xe4, 0xa8, 0x41,
	0xda, 0xff, 0xcd, 0x55, 0x86, 0x36, 0xbe, 0x61, 0x52, 0xf8, 0xbb, 0x0e, 0x82, 0x48, 0x69, 0x9a,
	0xe0, 0x47, 0x9e, 0x5c, 0x04, 0x4b, 0x34, 0x15, 0x79, 0x26, 0xa7, 0xde, 0x29, 0xae, 0x92, 0xd7,
	0x84, 0xe9, 0xd2, 0xba, 0x5d, 0xf3, 0xc5, 0xb0, 0xbf, 0xa4, 0x3b, 0x71, 0x44, 0x46, 0x2b, 0xfc,
	0xeb, 0x6f, 0xd5, 0xf6, 0x14, 0xfe, 0x7c, 0x70, 0x5a, 0x7d, 0xfd, 0x2f, 0x18, 0x83, 0x16, 0xa5,
	0x91, 0x1f, 0x05, 0x95, 0x74, 0xa9, 0xc1, 0x5b, 0x4a, 0x85, 0x6d, 0x13, 0x07, 0x4f, 0x4e, 0x45,
	0xb2, 0x0f, 0xc9, 0x1c, 0xa6, 0xbc, 0xec, 0x73, 0x90, 0x7b, 0xcf, 0x59, 0x8f, 0xa1, 0xf9, 0x2d,
	0xf2, 0xb1, 0x00, 0x94, 0x37, 0x9f, 0xd0, 0x2e, 0x9c, 0x6e, 0x28, 0x3f, 0x80, 0xf0, 0x3d, 0xd3,
	0x25, 0x8a, 0xb5, 0xe7, 0x42, 0xb3, 0xc7, 0xea, 0xf7, 0x4c, 0x11, 0x33, 0x03, 0xa2, 0xac, 0x60
];

let SBOXES1, SBOXES2;

function precompute()
{
	if (SBOX1)
	{
		return;
	}

	[SBOX1, SBOX3] = getRijndaelSboxes();

	SBOXES1 = [
		SBOX1, SBOX2, SBOX3, SBOX4, 
		SBOX1, SBOX2, SBOX3, SBOX4, 
		SBOX1, SBOX2, SBOX3, SBOX4, 
		SBOX1, SBOX2, SBOX3, SBOX4
	];

	SBOXES2 = [
		SBOX3, SBOX4, SBOX1, SBOX2, 
		SBOX3, SBOX4, SBOX1, SBOX2, 
		SBOX3, SBOX4, SBOX1, SBOX2, 
		SBOX3, SBOX4, SBOX1, SBOX2
	];
}

// Substitution layers:
function sl1(x)
{
	for (let i = 0; i < 16; i++)
	{
		x[i] = SBOXES1[i][x[i]];
	}
}

function sl2(x)
{
	for (let i = 0; i < 16; i++)
	{
		x[i] = SBOXES2[i][x[i]];
	}
}

// Diffusion layer
function A(x)
{
	const
		a = x[3] ^ x[4] ^ x[6] ^ x[ 8] ^ x[ 9] ^ x[13] ^ x[14],
		b = x[2] ^ x[5] ^ x[7] ^ x[ 8] ^ x[ 9] ^ x[12] ^ x[15],
		c = x[1] ^ x[4] ^ x[6] ^ x[10] ^ x[11] ^ x[12] ^ x[15],
		d = x[0] ^ x[5] ^ x[7] ^ x[10] ^ x[11] ^ x[13] ^ x[14],
		e = x[0] ^ x[2] ^ x[5] ^ x[ 8] ^ x[11] ^ x[14] ^ x[15],
		f = x[1] ^ x[3] ^ x[4] ^ x[ 9] ^ x[10] ^ x[14] ^ x[15],
		g = x[0] ^ x[2] ^ x[7] ^ x[ 9] ^ x[10] ^ x[12] ^ x[13],
		h = x[1] ^ x[3] ^ x[6] ^ x[ 8] ^ x[11] ^ x[12] ^ x[13],
		i = x[0] ^ x[1] ^ x[4] ^ x[ 7] ^ x[10] ^ x[13] ^ x[15],
		j = x[0] ^ x[1] ^ x[5] ^ x[ 6] ^ x[11] ^ x[12] ^ x[14],
		k = x[2] ^ x[3] ^ x[5] ^ x[ 6] ^ x[ 8] ^ x[13] ^ x[15],
		l = x[2] ^ x[3] ^ x[4] ^ x[ 7] ^ x[ 9] ^ x[12] ^ x[14],
		m = x[1] ^ x[2] ^ x[6] ^ x[ 7] ^ x[ 9] ^ x[11] ^ x[12],
		n = x[0] ^ x[3] ^ x[6] ^ x[ 7] ^ x[ 8] ^ x[10] ^ x[13],
		o = x[0] ^ x[3] ^ x[4] ^ x[ 5] ^ x[ 9] ^ x[11] ^ x[14],
		p = x[1] ^ x[2] ^ x[4] ^ x[ 5] ^ x[ 8] ^ x[10] ^ x[15];
	
	x[ 0] = a; x[ 1] = b; x[ 2] = c; x[ 3] = d;
	x[ 4] = e; x[ 5] = f; x[ 6] = g; x[ 7] = h;
	x[ 8] = i; x[ 9] = j; x[10] = k; x[11] = l;
	x[12] = m; x[13] = n; x[14] = o; x[15] = p;
}

// Round functions

// Odd rounds
function fO(d, rk)
{
	xorBytes(d, rk);
	sl1(d);
	A(d);
}

// Even rounds
function fE(d, rk)
{
	xorBytes(d, rk);
	sl2(d);
	A(d);
}

class AriaTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("rounds", "Rounds", 0, { type: "select", values: ROUNDS_VALUES, texts: ROUNDS_NAMES });
	}

	transform(bytes, keyBytes)
	{
		precompute();

		this.checkBytesSize("Key", keyBytes, [128, 192, 256]);

		const keySize = keyBytes.length * 8;
		const rounds = this.options.rounds === 0 ? RECOMMENDED_ROUNDS[keySize] : this.options.rounds;

		if (!ROUNDS_VALUES.includes(rounds))
		{
			throw new TransformError(`Number of rounds must be even and between 2 and 16. Was: ${rounds}.`);
		}

		const keys = this.cacheKeys(
			"ARIA",
			() => this.generateKeys(keyBytes, rounds),
			keyBytes,
			rounds
		);

		return this.transformBlocks(bytes, 128, keys, rounds);
	}

	generateKey(a, b, bRot)
	{
		const key = Uint8Array.from(b);
		rorBytes(key, bRot);
		xorBytes(key, a);
		return key;
	}

	generateKeys(keyBytes, rounds)
	{
		const kl = new Uint8Array(16);
		const kr = new Uint8Array(16);
		//  KL is set to the leftmost 128 bits of K
		kl.set(keyBytes.subarray(0, 16));
		// ... and KR is set to the remaining bits of K (if any), right-padded with zeros to a 128-bit value
		kr.set(keyBytes.subarray(16));

		// TODO: Variant v0.9: ck[n] are the same regardless of key size (ck[n] = C[n])
		let ck1, ck2, ck3;
		switch (keyBytes.length)
		{
			case 16:
				ck1 = C1; ck2 = C2; ck3 = C3;
				break;
			case 24:
				ck1 = C2; ck2 = C3; ck3 = C1;
				break;
			case 32:
				ck1 = C3; ck2 = C1; ck3 = C2;
				break;
		}

		const w0 = Uint8Array.from(kl);
		const w1 = Uint8Array.from(w0); fO(w1, ck1); xorBytes(w1, kr);
		const w2 = Uint8Array.from(w1); fE(w2, ck2); xorBytes(w2, w0);
		const w3 = Uint8Array.from(w2); fO(w3, ck3); xorBytes(w3, w1);

		const keys = new Array(rounds + 1);

		// TODO: Variant v0.9: The actual generation is different
		for (let r = 0; r < rounds + 1; r++)
		{
			let a, b, rot;
			switch (r % 4)
			{
				case 0: a = w0; b = w1; break;
				case 1: a = w1; b = w2; break;
				case 2: a = w2; b = w3; break;
				case 3: a = w3; b = w0; break;
			}
			switch (Math.floor(r / 4))
			{
				case 0: rot = 19; break;
				case 1: rot = 31; break;
				case 2: rot = 67; break;
				case 3: rot = 97; break;
				case 4: rot = 109; break;
			}
			keys[r] = this.generateKey(a, b, rot);
		}

		if (this.decrypt)
		{
			keys.reverse();
			for (let r = 1; r < rounds; r++)
			{
				A(keys[r]);
			}
		}

		return keys;
	}

	transformBlock(block, dest, destOffset, keys, rounds)
	{
		const p = Uint8Array.from(block);
		
		for (let r = 0; r < rounds - 1; r++)
		{
			if (r % 2 === 0)
			{
				// "Odd" because round numbers really start from 1
				fO(p, keys[r]);
			}
			else
			{
				fE(p, keys[r]);
			}

		}
		// Last round:
		xorBytes(p, keys[rounds - 1]);
		sl2(p);
		
		xorBytes(p, keys[rounds]);

		dest.set(p, destOffset);
	}
}

class AriaEncryptTransform extends AriaTransform
{
	constructor()
	{
		super(false);
	}
}

class AriaDecryptTransform extends AriaTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	AriaEncryptTransform,
	AriaDecryptTransform
};