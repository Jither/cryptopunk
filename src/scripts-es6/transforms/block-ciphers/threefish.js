import { BlockCipherTransform } from "./block-cipher";
import { TransformError } from "../transforms";
import { checkSize, bytesToInt64sLE, int64sToBytesLE } from "../../cryptopunk.utils";
import { add64, rol64, ror64, sub64, xor64 } from "../../cryptopunk.bitarith";

// 1.1 - 1.2 Pre-tweak constant (2^^64 / 3)
const KEY_SCHEDULE_CONST_1_1 = { hi: 0x55555555, lo: 0x55555555 };

// 1.3 tweaked constant (found using AES)
const KEY_SCHEDULE_CONST_1_3 = { hi: 0x1bd11bda, lo: 0xa9fc1a22 };

// 1.1 Pre-tweak rotation constants
const R_4_1_1 = [
	5, 36, 13, 58, 26, 53, 11, 59,
	56, 28, 46, 44, 20, 35, 42, 50
];

const R_8_1_1 = [
	38, 48, 34, 26, 33, 39, 29, 33,
	30, 20, 14, 12, 49, 27, 26, 51,
	50, 43, 15, 58,  8, 41, 11, 39,
	53, 31, 27,  7, 42, 14,  9, 35
];

const R_16_1_1 = [
	55, 25, 33, 34, 28, 17, 58, 47,
	43, 25,  8, 43,  7,  6,  7, 49,
	37, 46, 18, 25, 47, 18, 32, 27,
	40, 13, 57, 60, 48, 25, 45, 58,
	16, 14, 21, 44, 51, 43, 19, 37,
	22, 13, 12,  9,  9, 42, 18, 48,
	38, 52, 32, 59, 35, 40,  2, 53,
	12, 57, 54, 34, 41, 15, 56, 56
];

// 1.2 Tweaked rotation constants
const R_4_1_2 = [
	14, 52, 23,  5, 25, 46, 58, 32,
	16, 57, 40, 37, 33, 12, 22, 32	
];

const R_8_1_2 = [
	46, 33, 17, 44, 39, 13, 25,  8,
	36, 27, 49,  9, 30, 50, 29, 35,
	19, 14, 36, 54, 34, 10, 39, 56,
	37, 42, 39, 56, 24, 17, 43, 22
];

const R_16_1_2 = [
	24, 38, 33,  5, 41, 16, 31,  9,
	13, 19,  4, 20,  9, 34, 44, 48,
	8 , 10, 51, 48, 37, 56, 47, 35,
	47, 55, 13, 41, 31, 51, 46, 52,
	8 , 49, 34, 47, 12,  4, 19, 23,
	17, 18, 41, 28, 47, 53, 42, 31,
	22, 23, 59, 16, 44, 42, 44, 37,
	37, 52, 17, 25, 30, 41, 25, 20
];

const P_4  = [0, 3, 2, 1];
const P_8  = [2, 1, 4, 7, 6, 5, 0, 3];
const P_16 = [0, 9, 2, 13, 6, 11, 4, 15, 10, 7, 12, 3, 14, 5, 8, 1];

const VARIANT_NAMES = [
	"1.3",
	"1.2",
	"1.1"
];

const BLOCK_SIZES = [
	256,
	512,
	1024
];

const ROUNDS_BY_BLOCK_SIZE = {
	256: 72,
	512: 72,
	1024: 80
};

function MIX(x0, x1, rot)
{
	const y0 = add64(x0, x1);
	const y1 = xor64(rol64(x1, rot), y0);
	return [y0, y1];
}

function invMIX(y0, y1, rot)
{
	const x1 = ror64(xor64(y1, y0), rot);
	const x0 = sub64(y0, x1);
	return [x0, x1];
}

class ThreefishTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addInput("bytes", "Tweak");
		this.addOption("variant", "Variant", "1.3", { type: "select", texts: VARIANT_NAMES });
		this.addOption("blockSize", "Block size", 256, { type: "select", texts: BLOCK_SIZES });
	}

	transform(bytes, keyBytes, tweakBytes)
	{
		const blockSize = this.options.blockSize;

		checkSize(blockSize, BLOCK_SIZES);
		
		const keySize = keyBytes.length * 8;
		const keyRequirement = checkSize(keySize, blockSize);
		if (keyRequirement)
		{
			throw new TransformError(`Key size must be ${keyRequirement} bits (same as block size). Was: ${keySize} bits.`);
		}
		
		const tweakSize = tweakBytes.length * 8;
		const tweakRequirement = checkSize(tweakSize, 128);
		if (tweakRequirement)
		{
			throw new TransformError(`Tweak size must be ${tweakRequirement} bits. Was ${tweakSize} bits.`);
		}

		const rounds = ROUNDS_BY_BLOCK_SIZE[blockSize];

		const constants = this.getConstants(blockSize);

		const subKeys = this.createRoundKeys(keyBytes, tweakBytes, rounds, constants);

		return this.transformBlocks(bytes, blockSize, subKeys, rounds, constants);
	}

	// Returns version and block size dependent constants
	getConstants(blockSize)
	{
		const variant = this.options.variant;

		let P, R;

		switch (blockSize)
		{
			case 256:
				P = P_4;
				R = variant === "1.1" ? R_4_1_1 : R_4_1_2;
				break;
			case 512:
				P = P_8;
				R = variant === "1.1" ? R_8_1_1 : R_8_1_2;
				break;
			case 1024:
				P = P_16;
				R = variant === "1.1" ? R_16_1_1 : R_16_1_2;
				break;
		}

		return { P, R, keyScheduleConstant: (variant === "1.3" ? KEY_SCHEDULE_CONST_1_3 : KEY_SCHEDULE_CONST_1_1) };
	}

	createRoundKeys(keyBytes, tweakBytes, rounds, constants)
	{
		const subKeyCount = rounds / 4 + 1;
		
		const keys = bytesToInt64sLE(keyBytes);
		const keyCount = keys.length;
		keys.push(xor64(constants.keyScheduleConstant, ...keys)); // Add kNw

		const t = bytesToInt64sLE(tweakBytes);
		t.push(xor64(t[0], t[1])); // Add t2

		const k = new Array(subKeyCount);
		for (let s = 0; s < subKeyCount; s++)
		{
			const subKey = new Array(keyCount);
			for (let i = 0; i < keyCount; i++)
			{
				const key = keys[(s + i) % (keyCount + 1)];
				subKey[i] = { hi: key.hi, lo: key.lo };
			}
			subKey[keyCount - 3] = add64(subKey[keyCount - 3], t[s % 3]);
			subKey[keyCount - 2] = add64(subKey[keyCount - 2], t[(s + 1) % 3]);
			subKey[keyCount - 1] = add64(subKey[keyCount - 1], { hi: 0, lo: s });
			k[s] = subKey;
		}

		return k;
	}
}

class ThreefishEncryptTransform extends ThreefishTransform
{
	constructor()
	{
		super(false);
	}

	transformBlock(block, dest, destOffset, subKeys, rounds, constants)
	{
		const
			v = bytesToInt64sLE(block),
			e = new Array(v.length),
			P = constants.P,
			R = constants.R;
		let k;

		for (let d = 0; d < rounds; d++)
		{
			if (d % 4 === 0)
			{
				k = subKeys[d / 4];
				for (let i = 0; i < v.length; i++)
				{
					v[i] = add64(v[i], k[i]);
				}
			}

			for (let j = 0; j < v.length / 2; j++)
			{
				const [f1, f2] = MIX(v[j * 2], v[j * 2 + 1], R[j * 8 + (d % 8)]);
				e[j * 2] = f1;
				e[j * 2 + 1] = f2;
			}

			for (let i = 0; i < e.length; i++)
			{
				v[i] = e[P[i]];
			}
		}

		k = subKeys[rounds / 4];
		for (let i = 0; i < v.length; i++)
		{
			v[i] = add64(v[i], k[i]);
		}

		dest.set(int64sToBytesLE(v), destOffset);
	}
}

class ThreefishDecryptTransform extends ThreefishTransform
{
	constructor()
	{
		super(true);
	}

	// Threefish decryption = reverse keys and operations
	transformBlock(block, dest, destOffset, subKeys, rounds, constants)
	{
		const
			v = bytesToInt64sLE(block),
			e = new Array(v.length),
			P = constants.P,
			R = constants.R;

		let k;

		k = subKeys[rounds / 4];
		for (let i = 0; i < v.length; i++)
		{
			v[i] = sub64(v[i], k[i]);
		}

		for (let d = rounds - 1; d >= 0; d--)
		{
			for (let i = 0; i < e.length; i++)
			{
				e[P[i]] = v[i];
			}

			for (let j = 0; j < v.length / 2; j++)
			{
				const [f1, f2] = invMIX(e[j * 2], e[j * 2 + 1], R[j * 8 + (d % 8)]);
				v[j * 2] = f1;
				v[j * 2 + 1] = f2;
			}

			if (d % 4 === 0)
			{
				k = subKeys[d / 4];
				for (let i = 0; i < v.length; i++)
				{
					v[i] = sub64(v[i], k[i]);
				}
			}

		}

		dest.set(int64sToBytesLE(v), destOffset);
	}
}

export {
	ThreefishEncryptTransform,
	ThreefishDecryptTransform,
};