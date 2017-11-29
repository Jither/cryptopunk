import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int64sToBytesBE, bytesToInt64sBE, int32sToBytesBE } from "../../cryptopunk.utils";
import { add64, xor64, ZERO_64 } from "../../cryptopunk.bitarith";
import bigint from "../../jither.bigint";

const VARIANT_VALUES = [
	"v1",
	"v2"
];

const VARIANT_NAMES = [
	"DFCv1",
	"DFCv2"
];

const EES = [
	0xb7e15162, 0x8aed2a6a, 0xbf715880, 0x9cf4f3c7, 
	0x62e7160f, 0x38b4da56, 0xa784d904, 0x5190cfef, 
	0x324e7738, 0x926cfbe5, 0xf4bf8d8d, 0x8c31d763,
	0xda06c80a, 0xbb1185eb, 0x4f7c7b57, 0x57f59584, 
	0x90cfd47d, 0x7c19bb42, 0x158d9554, 0xf7b46bce, 
	0xd55c4d79, 0xfd5f24d6, 0x613c31c3, 0x839a2ddf,
	0x8a9a276b, 0xcfbfa1c8, 0x77c56284, 0xdab79cd4, 
	0xc2b3293d, 0x20e9e5ea, 0xf02ac60a, 0xcc93ed87, 
	0x4422a52e, 0xcb238fee, 0xe5ab6add, 0x835fd1a0,
	0x753d0a8f, 0x78e537d2, 0xb95bb79d, 0x8dcaec64, 
	0x2c1e9f23, 0xb829b5c2, 0x780bf387, 0x37df8bb3, 
	0x00d01334, 0xa0d0bd86, 0x45cbfa73, 0xa6160ffe,
	0x393c48cb, 0xbbca060f, 0x0ff8ec6d, 0x31beb5cc, 
	0xeed7f2f0, 0xbb088017, 0x163bc60d, 0xf45a0ecb, 
	0x1bcd289b, 0x06cbbfea, 0x21ad08e1, 0x847f3f73,
	0x78d56ced, 0x94640d6e, 0xf0d3d37b, 0xe67008e1,

	0x86d1bf27, 0x5b9b241d,	0xeb64749a, 0x47dfdfb9,
	0x6632c3eb, 0x061b6472, 0xbbf84c26, 0x144e49c2
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

	RT = EES.slice(0, 64);
	KD = { hi: EES[64], lo: EES[65] };
	KC = EES[66];
	KA = [
		{ hi: EES[0], lo: EES[1] },
		{ hi: EES[2], lo: EES[3] },
		{ hi: EES[4], lo: EES[5] }
	];
	KB = [
		{ hi: EES[6], lo: EES[7] },
		{ hi: EES[8], lo: EES[9] },
		{ hi: EES[10], lo: EES[11] }
	];

	KS_1 = int32sToBytesBE(EES.slice(12, 20));
	KS_2 = int32sToBytesBE(EES.slice(64, 72));
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