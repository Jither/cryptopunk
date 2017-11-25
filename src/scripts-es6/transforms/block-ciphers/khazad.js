import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { S_BOX, S_BOX_0 } from "./anubis";
import { TransformError } from "../transforms";

// TODO: UNFINISHED

const VARIANT_VALUES = [
	"khazad-0",
	"khazad"
];

const VARIANT_NAMES = [
	"KHAZAD-0",
	"KHAZAD"
];

const S_BOXES = {
	"khazad-0": S_BOX_0,
	"khazad": S_BOX
};

const ROUNDS = 8;

const TABLESlo = {};
const TABLEShi = {};

// Multiplies x by 3, 4, 5, 6, 7, 8 - in GF(2^8) field
function gfMul(x)
{
	let x2 = x << 1;
	if (x2 >= 0x100)
	{
		x2 ^= 0x11d;
	}
	const x3 = x2 ^ x;
	let x4 = x2 << 1;
	if (x4 >= 0x100)
	{
		x4 ^= 0x11d;
	}
	const x5 = x4 ^ x;
	const x6 = x4 ^ x2;
	const x7 = x6 ^ x;
	let x8 = x4 << 1;
	if (x8 >= 0x100)
	{
		x8 ^= 0x11d;
	}

	const x11 = x8 ^ x2 ^ x;

	return [x3, x4, x5, x6, x7, x8, x11];
}

// TODO: Remove transformation tables (do transformations directly in cipher)
function precompute(variant)
{
	const tablesHi = TABLEShi[variant];
	const tablesLo = TABLESlo[variant];
	if (tablesHi)
	{
		return { hi: tablesHi, lo: tablesLo };
	}
	const sbox = S_BOXES[variant];

	const T0hi = new Uint32Array(256);
	const T0lo = new Uint32Array(256);
	const T1hi = new Uint32Array(256);
	const T1lo = new Uint32Array(256);
	const T2hi = new Uint32Array(256);
	const T2lo = new Uint32Array(256);
	const T3hi = new Uint32Array(256);
	const T3lo = new Uint32Array(256);
	const T4hi = new Uint32Array(256);
	const T4lo = new Uint32Array(256);
	const T5hi = new Uint32Array(256);
	const T5lo = new Uint32Array(256);
	const T6hi = new Uint32Array(256);
	const T6lo = new Uint32Array(256);
	const T7hi = new Uint32Array(256);
	const T7lo = new Uint32Array(256);

	for (let i = 0; i < 256; i++)
	{
		const s1 = sbox[i];
		const [s3, s4, s5, s6, s7, s8, s11] = gfMul(s1);

		T0hi[i] = (s1  << 24) | (s3  << 16) | (s4  << 8) | s5;
		T0lo[i] = (s6  << 24) | (s8  << 16) | (s11 << 8) | s7;

		T1hi[i] = (s3  << 24) | (s1  << 16) | (s5  << 8) | s4;
		T1lo[i] = (s8  << 24) | (s6  << 16) | (s7  << 8) | s11;

		T2hi[i] = (s4  << 24) | (s5  << 16) | (s1  << 8) | s3;
		T2lo[i] = (s11 << 24) | (s7  << 16) | (s6  << 8) | s8;

		T3hi[i] = (s5  << 24) | (s4  << 16) | (s3  << 8) | s1;
		T3lo[i] = (s7  << 24) | (s11 << 16) | (s8  << 8) | s6;

		T4hi[i] = (s6  << 24) | (s8  << 16) | (s11 << 8) | s7;
		T4lo[i] = (s1  << 24) | (s3  << 16) | (s11 << 8) | s5;

		T5hi[i] = (s8  << 24) | (s6  << 16) | (s7  << 8) | s11;
		T5lo[i] = (s3  << 24) | (s1  << 16) | (s5  << 8) | s4;

		T6hi[i] = (s11 << 24) | (s7  << 16) | (s6  << 8) | s8;
		T6lo[i] = (s4  << 24) | (s5  << 16) | (s1  << 8) | s3;

		T7hi[i] = (s7  << 24) | (s11 << 16) | (s8  << 8) | s6;
		T7lo[i] = (s5  << 24) | (s4  << 16) | (s3  << 8) | s1;
	}

	TABLEShi[variant] = [T0hi, T1hi, T2hi, T3hi, T4hi, T5hi, T6hi, T7hi];
	TABLESlo[variant] = [T0lo, T1lo, T2lo, T3lo, T4lo, T5lo, T6lo, T7lo];

	return { hi: TABLEShi[variant], lo: TABLESlo[variant] };
}

class KhazadBaseTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		throw new TransformError("Not implemented");
		//this.addOption("variant", "Variant", "khazad", { type: "select", values: VARIANT_VALUES, texts: VARIANT_NAMES });
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, 128);

		// Precalculate tables (once, stored for later use)
		const tables = precompute(this.options.variant);

		const roundKeys = this.prepareRoundKeys(keyBytes, tables);

		return this.transformBlocks(bytes, 128, roundKeys, tables);
	}

	prepareRoundKeys(keyBytes, tables)
	{
		const [T0, T1, T2, T3, T4, T5] = tables;

		const keyWordCount = keyBytes.length / 4;
		const kappa = bytesToInt32sBE(keyBytes);
		const inter = new Uint32Array(keyWordCount);

		const rounds = 8 + keyWordCount;

		const roundKeys = new Array(rounds + 1);

		const k = new Uint32Array(4);
		for (let r = 0;  r < roundKeys.length; r++)
		{
			const kappaN = kappa[keyWordCount - 1];
			for (let i = 0; i < 4; i++)
			{
				k[i] = T4[(kappaN >>> (24 - i * 8)) & 0xff];
			}

			for (let j = keyWordCount - 2; j >= 0; j--)
			{
				for (let i = 0; i < 4; i++)
				{
					const ki = k[i];
					k[i] = T4[(kappa[j] >>> (24 - i * 8)) & 0xff] ^
						(T5[ ki >>> 24        ] & 0xff000000) ^
						(T5[(ki >>> 16) & 0xff] & 0x00ff0000) ^
						(T5[(ki >>>  8) & 0xff] & 0x0000ff00) ^
						(T5[(ki       ) & 0xff] & 0x000000ff);
				}
			}

			roundKeys[r] = Uint32Array.from(k);

			for (let i = 0; i < keyWordCount; i++)
			{
				inter[i] =
					T0[(kappa[i] >>> 24)       ] ^
					T1[(kappa[(keyWordCount + i - 1) % keyWordCount] >>> 16) & 0xff] ^
					T2[(kappa[(keyWordCount + i - 2) % keyWordCount] >>>  8) & 0xff] ^
					T3[(kappa[(keyWordCount + i - 3) % keyWordCount]       ) & 0xff];
			}

			kappa[0] =
				(T0[4 * r    ] & 0xff000000) ^
				(T1[4 * r + 1] & 0x00ff0000) ^
				(T2[4 * r + 2] & 0x0000ff00) ^
				(T3[4 * r + 3] & 0x000000ff) ^
				inter[0];
			
			for (let i = 1; i < keyWordCount; i++)
			{
				kappa[i] = inter[i];
			}
		}

		return roundKeys;
	}

	transformBlock(block, dest, destOffset, roundKeys, tables)
	{
		const [T0, T1, T2, T3] = tables;

		const state = bytesToInt32sBE(block);
		const inter = new Uint32Array(state.length);

		const rounds = roundKeys.length - 1;

		for (let i = 0; i < 4; i++)
		{
			state[i] ^= roundKeys[0][i];
		}

		// N-1 rounds:
		for (let r = 1; r < rounds; r++)
		{
			for (let i = 0; i < 4; i++)
			{
				const shift = 24 - (i * 8);
				inter[i] = 
					T0[(state[0] >>> shift) & 0xff] ^
					T1[(state[1] >>> shift) & 0xff] ^
					T2[(state[2] >>> shift) & 0xff] ^
					T3[(state[3] >>> shift) & 0xff] ^
					roundKeys[r][i];
			}
			for (let i = 0; i < 4; i++)
			{
				state[i] = inter[i];
			}
		}

		// Last round:
		for (let i = 0; i < 4; i++)
		{
			const shift = 24 - (i * 8);
			inter[i] = 
				(T0[(state[0] >>> shift) & 0xff] & 0xff000000) ^
				(T1[(state[1] >>> shift) & 0xff] & 0x00ff0000) ^
				(T2[(state[2] >>> shift) & 0xff] & 0x0000ff00) ^
				(T3[(state[3] >>> shift) & 0xff] & 0x000000ff) ^
				roundKeys[rounds][i];
		}

		dest.set(int32sToBytesBE(inter), destOffset);
	}
}


class KhazadEncryptTransform extends KhazadBaseTransform
{
	constructor()
	{
		super(false);
	}
}

class KhazadDecryptTransform extends KhazadBaseTransform
{
	constructor()
	{
		super(true);
	}

	// Invert key schedule for decryption:
	prepareRoundKeys(keyBytes, tables)
	{
		const [T0, T1, T2, T3, T4] = tables;

		const roundKeys = super.prepareRoundKeys(keyBytes, tables);
		const rounds = roundKeys.length - 1;
		// Reverse order of round keys:
		roundKeys.reverse();

		// Replace round keys 1 to N-1 with their inverted version:
		for (let r = 1; r < rounds; r++)
		{
			for (let i = 0; i < 4; i++)
			{
				const v = roundKeys[r][i];
				roundKeys[r][i] =
					T0[T4[(v >>> 24)       ] & 0xff] ^
					T1[T4[(v >>> 16) & 0xff] & 0xff] ^
					T2[T4[(v >>>  8) & 0xff] & 0xff] ^
					T3[T4[(v       ) & 0xff] & 0xff];
			}
		}

		return roundKeys;
	}
}

export {
	KhazadEncryptTransform,
	KhazadDecryptTransform
};