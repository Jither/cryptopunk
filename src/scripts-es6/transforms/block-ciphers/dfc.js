import { BlockCipherTransform } from "./block-cipher";
import { bytesToInt32sBE, int64ToHex, int64sToBytesBE, bytesToInt64sBE } from "../../cryptopunk.utils";
import { add64, xor64, ZERO_64 } from "../../cryptopunk.bitarith";
import bigint from "../../jither.bigint";

// TODO: UNFINISHED

const KEY_PADDING = Uint8Array.from([
	0xda, 0x06, 0xc8, 0x0a, 0xbb, 0x11, 0x85, 0xeb,
	0x4f, 0x7c, 0x7b, 0x57, 0x57, 0xf5, 0x95, 0x84, 
	0x90, 0xcf, 0xd4, 0x7d, 0x7c, 0x19, 0xbb, 0x42,
	0x15, 0x8d, 0x95, 0x54, 0xf7, 0xb4, 0x6b, 0xce
]);

const KA = [
	{ hi: 0xb7e15162, lo: 0x8aed2a6a },
	{ hi: 0xbf715880, lo: 0x9cf4f3c7 },
	{ hi: 0x62e7160f, lo: 0x38b4da56 }
];

const KB = [
	{ hi: 0xa784d904, lo: 0x5190cfef },
	{ hi: 0x324e7738, lo: 0x926cfbe5 },
	{ hi: 0xf4bf8d8d, lo: 0x8c31d763 }
];

const KC = 0xeb64749a;

const KD = { hi: 0x86d1bf27, lo: 0x5b9b241d };

const RT = [
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
	0x78d56ced, 0x94640d6e, 0xf0d3d37b, 0xe67008e1
];

function CP(y)
{
	const yl = y.hi;
	const yr = y.lo;

	const x = {
		hi: yl ^ RT[yr >>> 26],
		lo: yr ^ KC
	};

	return add64(x, KD);
}

function RF(a, b, x)
{
	// Can't be bothered with 128-bit javascript craziness at the moment, so...
	// Enter bigint for a moment
	a = bigint(int64ToHex(a, true), 16);
	b = bigint(int64ToHex(b, true), 16);
	x = bigint(int64ToHex(x, true), 16);

	// (a * x + b) mod (2^64 + 13)
	const ints = a.mul(x).add(b).mod("0x1000000000000000d").toInt32sBE();
	const y = { hi: ints[ints.length - 1] || 0, lo: ints[ints.length - 2] };
	return CP(y);
}

class DfcTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, { min: 0, max: 256 });

		const subKeys = this.generateSubKeys(keyBytes);

		return this.transformBlocks(bytes, 128, subKeys);
	}

	transformBlock(block, dest, destOffset, subKeys)
	{
		let [left, right] = bytesToInt64sBE(block);

		for (let i = 0; i < 8; i++)
		{
			const key = subKeys[i];
			const a = key[0], b = key[1];
			left = xor64(left, RF(a, b, right));
			[left, right] = [right, left];
		}

		dest.set(int64sToBytesBE([right, left]), destOffset);
	}

	generateSubKeys(keyBytes)
	{
		const keys = new Array(8);

		const paddedKeyBytes = new Uint8Array(32);
		paddedKeyBytes.set(keyBytes);
		paddedKeyBytes.set(KEY_PADDING.subarray(0, 32 - keyBytes.length), keyBytes.length);
		const pk = bytesToInt32sBE(paddedKeyBytes);
		const oap = new Array(4);
		const obp = new Array(4);
		const eap = new Array(4);
		const ebp = new Array(4);

		oap[0] = { hi: pk[0], lo: pk[7] };
		obp[0] = { hi: pk[4], lo: pk[3] };
		eap[0] = { hi: pk[1], lo: pk[6] };
		ebp[0] = { hi: pk[5], lo: pk[2] };
		
		for (let i = 1; i < 4; i++)
		{
			oap[i] = xor64(oap[0], KA[i - 1]);
			obp[i] = xor64(obp[0], KB[i - 1]);
			eap[i] = xor64(eap[0], KA[i - 1]);
			ebp[i] = xor64(ebp[0], KB[i - 1]);
		}

		let keyIndex = 0;
		let left = ZERO_64, right = ZERO_64;
		for (let r = 0; r < 4; r++)
		{
			for (let i = 0; i < 4; i++)
			{
				const a = oap[i], b = obp[i];
				left = xor64(left, RF(a, b, right));
				[left, right] = [right, left];
			}
			[left, right] = [right, left];
			keys[keyIndex++] = [left, right];

			for (let i = 0; i < 4; i++)
			{
				const a = eap[i], b = ebp[i];
				left = xor64(left, RF(a, b, right));
				[left, right] = [right, left];
			}
			[left, right] = [right, left];
			keys[keyIndex++] = [left, right];
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

	generateSubKeys(keyBytes)
	{
		const keys = super.generateSubKeys(keyBytes);
		keys.reverse();
		return keys;
	}
}

export {
	DfcEncryptTransform,
	DfcDecryptTransform
};