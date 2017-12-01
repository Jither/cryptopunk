import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int64sToBytesBE, bytesToInt64sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { add64, xor64, ZERO_64 } from "../../cryptopunk.bitarith";
import { E_FRACTION } from "../shared/constants";
import bigint from "../../jither.bigint";

const VARIANT_VALUES = [
	"v1",
	"v2"
];

const VARIANT_NAMES = [
	"DFCv1",
	"DFCv2"
];

let KS_1, // v1 key schedule
	KS_2, // v2 key schedule
	KA, // v1 key schedule
	KB, // v1 key schedule
	KC, // v1 + v2 round function
	KD, // v1 + v2 round function
	RT; // v1 round function + v2 round function & key schedule

function precompute()
{
	if (KS_1)
	{
		// Already computed
		return;
	}

	RT = E_FRACTION.slice(0, 64);
	KD = { hi: E_FRACTION[64], lo: E_FRACTION[65] };
	KC = E_FRACTION[66];
	KA = [
		{ hi: E_FRACTION[0], lo: E_FRACTION[1] },
		{ hi: E_FRACTION[2], lo: E_FRACTION[3] },
		{ hi: E_FRACTION[4], lo: E_FRACTION[5] }
	];
	KB = [
		{ hi: E_FRACTION[6], lo: E_FRACTION[7] },
		{ hi: E_FRACTION[8], lo: E_FRACTION[9] },
		{ hi: E_FRACTION[10], lo: E_FRACTION[11] }
	];

	KS_1 = int32sToBytesBE(E_FRACTION.slice(12, 20));
	KS_2 = int32sToBytesBE(E_FRACTION.slice(64, 72));
}

function CP(y)
{
	const yl = y.hi;
	const yr = y.lo;

	const x = {
		hi: yr ^ RT[yl >>> 26],
		lo: yl ^ KC
	};

	return add64(x, KD);
}

const PRIME = bigint("0x1000000000000000d");

function RF(a, b, x)
{
	// Can't be bothered with 128-bit javascript craziness at the moment, so...
	// Enter bigint for a moment
	a = bigint.fromInt32sBE(a.hi, a.lo);
	b = bigint.fromInt32sBE(b.hi, b.lo);
	x = bigint.fromInt32sBE(x.hi, x.lo);

	// (a * x + b) mod (2^64 + 13)
	const rf = a.mul(x).add(b).mod(PRIME).toInt32sBE();
	// ... mod 2^64
	// = just get the two least significant int32s
	// (if the result is within 32 bits, hi will be undefined, so default to 0):
	const y = { hi: rf[rf.length - 2] || 0, lo: rf[rf.length - 1] };
	return CP(y);
}

class DfcTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		// TODO: Options for rounds/subkey rounds (but only for v2)
		this.addOption("variant", "Variant", "v2", { type: "select", values: VARIANT_VALUES, texts: VARIANT_NAMES });
	}

	transform(bytes, keyBytes)
	{
		precompute();

		this.checkBytesSize("Key", keyBytes, { min: 0, max: 256 });

		const subKeys = this.options.variant === "v1" ? this.generateSubKeys1(keyBytes) : this.generateSubKeys2(keyBytes);

		return this.transformBlocks(bytes, 128, subKeys);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		let [left, right] = bytesToInt64sBE(block);

		for (let i = 0; i < 8; i++)
		{
			const key = subKeys[i];
			const a = key[0], b = key[1];
			left = xor64(RF(a, b, right), left);
			[left, right] = [right, left];
		}

		dest.set(int64sToBytesBE([right, left]), destOffset);
	}

	padKey(keyBytes, padding)
	{
		const paddedKeyBytes = new Uint8Array(32);
		paddedKeyBytes.set(keyBytes);
		paddedKeyBytes.set(padding.subarray(0, 32 - keyBytes.length), keyBytes.length);
		return bytesToInt32sBE(paddedKeyBytes);
	}

	generateSubKeys1(keyBytes)
	{
		const rounds = 8;
		const subkeyRounds = 4;

		const pk = this.padKey(keyBytes, KS_1);

		const oap = new Array(4);
		const obp = new Array(4);
		const eap = new Array(4);
		const ebp = new Array(4);

		oap[0] = { hi: pk[0], lo: pk[7] };
		obp[0] = { hi: pk[4], lo: pk[3] };
		eap[0] = { hi: pk[1], lo: pk[6] };
		ebp[0] = { hi: pk[5], lo: pk[2] };
		
		// Note: Can't vary subkey rounds, because they depend on KA/KB constants
		for (let i = 1; i < subkeyRounds; i++)
		{
			oap[i] = xor64(oap[0], KA[i - 1]);
			obp[i] = xor64(obp[0], KB[i - 1]);
			eap[i] = xor64(eap[0], KA[i - 1]);
			ebp[i] = xor64(ebp[0], KB[i - 1]);
		}

		const keys = new Array(rounds);
		
		let left = ZERO_64, right = ZERO_64;
		for (let r = 0; r < rounds; r++)
		{
			for (let s = 0; s < subkeyRounds; s++)
			{
				const a = (r & 1) === 0 ? oap[s] : eap[s];
				const b = (r & 1) === 0 ? obp[s] : ebp[s];
				left = xor64(RF(a, b, right), left);
				[left, right] = [right, left];
			}
			[left, right] = [right, left];
			keys[r] = [left, right];
		}

		return keys;
	}

	generateSubKeys2(keyBytes)
	{
		const rounds = 8;
		const subkeyRounds = 4;
		const rs = rounds * subkeyRounds;

		const pk = this.padKey(keyBytes, KS_2);
		const irk = new Array(rs);

		// Note that IRK is counted from 0 in the paper/spec, but IRK[0] is NOT used directly for generating the round keys.
		// Same goes for RK[0]. We count from 0, so we'll use a variable for the "-1" entries:
		const irk0 = pk.slice(0, 4);
		const rk0 = pk.slice(4);

		let prevIRK = irk0;
		for (let i = 0; i < rs; i++)
		{
			const currIRK = irk[i] = Array.from(prevIRK);
			let rtIndex;
			if (i < 64)
			{
				rtIndex = RT[i] & 0xf;
			}
			else
			{
				rtIndex = (RT[i - 64] >>> 8) & 0xf;
			}
			rtIndex *= 4;
			for (let j = 0; j < 4; j++)
			{
				currIRK[j] ^= RT[rtIndex + j];
			}
			prevIRK = currIRK;
		}

		const keys = new Array(rounds);
		
		let irkIndex = 0,
			left = { hi: rk0[0], lo: rk0[1] },
			right = { hi: rk0[2], lo: rk0[3] };

		for (let r = 0; r < rounds; r++)
		{
			for (let s = 0; s < subkeyRounds; s++)
			{
				const k = irk[irkIndex++];
				const a = { hi: k[0], lo: k[1] };
				const b = { hi: k[2], lo: k[3] };

				left = xor64(RF(a, b, right), left);
				[left, right] = [right, left];
			}

			[left, right] = [right, left];
			
			keys[r] = [left, right];
		}

		return keys;
	}
}

class DfcEncryptTransform extends DfcTransform
{
	constructor()
	{
		super(false);
	}
}

class DfcDecryptTransform extends DfcTransform
{
	constructor()
	{
		super(true);
	}

	generateSubKeys1(keyBytes)
	{
		const keys = super.generateSubKeys1(keyBytes);
		keys.reverse();
		return keys;
	}

	generateSubKeys2(keyBytes)
	{
		const keys = super.generateSubKeys2(keyBytes);
		keys.reverse();
		return keys;
	}
}

export {
	DfcEncryptTransform,
	DfcDecryptTransform
};