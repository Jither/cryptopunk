import { MdHashTransform } from "./hash";
import { int64sToBytesBE, bytesToInt64sBE } from "../../cryptopunk.utils";
import { ror64, shr64, xor64 } from "../../cryptopunk.bitarith";

// TODO: This is INSANELY inefficient and wasteful in terms of the 64-bit math
// TODO: Maybe align this with Rijndael (and use byte arrays rather than 64-bit objects)

const WHIRLPOOL_0 = "whirlpool-0";
const WHIRLPOOL_T = "whirlpool-t";
const WHIRLPOOL = "whirlpool";

const VARIANT_NAMES = [
	"WHIRLPOOL-0",
	"WHIRLPOOL-T",
	"WHIRLPOOL"
];

const VARIANT_VALUES = [
	WHIRLPOOL_0,
	WHIRLPOOL_T,
	WHIRLPOOL
];

const SBOX_0 = [
	0x68, 0xd0, 0xeb, 0x2b, 0x48, 0x9d, 0x6a, 0xe4, 0xe3, 0xa3, 0x56, 0x81, 0x7d, 0xf1, 0x85, 0x9e, 
	0x2c, 0x8e, 0x78, 0xca, 0x17, 0xa9, 0x61, 0xd5, 0x5d, 0x0b, 0x8c, 0x3c, 0x77, 0x51, 0x22, 0x42, 
	0x3f, 0x54, 0x41, 0x80, 0xcc, 0x86, 0xb3, 0x18, 0x2e, 0x57, 0x06, 0x62, 0xf4, 0x36, 0xd1, 0x6b, 
	0x1b, 0x65, 0x75, 0x10, 0xda, 0x49, 0x26, 0xf9, 0xcb, 0x66, 0xe7, 0xba, 0xae, 0x50, 0x52, 0xab, 
	0x05, 0xf0, 0x0d, 0x73, 0x3b, 0x04, 0x20, 0xfe, 0xdd, 0xf5, 0xb4, 0x5f, 0x0a, 0xb5, 0xc0, 0xa0, 
	0x71, 0xa5, 0x2d, 0x60, 0x72, 0x93, 0x39, 0x08, 0x83, 0x21, 0x5c, 0x87, 0xb1, 0xe0, 0x00, 0xc3, 
	0x12, 0x91, 0x8a, 0x02, 0x1c, 0xe6, 0x45, 0xc2, 0xc4, 0xfd, 0xbf, 0x44, 0xa1, 0x4c, 0x33, 0xc5, 
	0x84, 0x23, 0x7c, 0xb0, 0x25, 0x15, 0x35, 0x69, 0xff, 0x94, 0x4d, 0x70, 0xa2, 0xaf, 0xcd, 0xd6, 
	0x6c, 0xb7, 0xf8, 0x09, 0xf3, 0x67, 0xa4, 0xea, 0xec, 0xb6, 0xd4, 0xd2, 0x14, 0x1e, 0xe1, 0x24, 
	0x38, 0xc6, 0xdb, 0x4b, 0x7a, 0x3a, 0xde, 0x5e, 0xdf, 0x95, 0xfc, 0xaa, 0xd7, 0xce, 0x07, 0x0f, 
	0x3d, 0x58, 0x9a, 0x98, 0x9c, 0xf2, 0xa7, 0x11, 0x7e, 0x8b, 0x43, 0x03, 0xe2, 0xdc, 0xe5, 0xb2, 
	0x4e, 0xc7, 0x6d, 0xe9, 0x27, 0x40, 0xd8, 0x37, 0x92, 0x8f, 0x01, 0x1d, 0x53, 0x3e, 0x59, 0xc1, 
	0x4f, 0x32, 0x16, 0xfa, 0x74, 0xfb, 0x63, 0x9f, 0x34, 0x1a, 0x2a, 0x5a, 0x8d, 0xc9, 0xcf, 0xf6, 
	0x90, 0x28, 0x88, 0x9b, 0x31, 0x0e, 0xbd, 0x4a, 0xe8, 0x96, 0xa6, 0x0c, 0xc8, 0x79, 0xbc, 0xbe, 
	0xef, 0x6e, 0x46, 0x97, 0x5b, 0xed, 0x19, 0xd9, 0xac, 0x99, 0xa8, 0x29, 0x64, 0x1f, 0xad, 0x55, 
	0x13, 0xbb, 0xf7, 0x6f, 0xb9, 0x47, 0x2f, 0xee, 0xb8, 0x7b, 0x89, 0x30, 0xd3, 0x7f, 0x76, 0x82
];

const SBOX_T = [
	0x18, 0x23, 0xc6, 0xe8, 0x87, 0xb8, 0x01, 0x4f, 0x36, 0xa6, 0xd2, 0xf5, 0x79, 0x6f, 0x91, 0x52,
	0x60, 0xbc, 0x9b, 0x8e, 0xa3, 0x0c, 0x7b, 0x35, 0x1d, 0xe0, 0xd7, 0xc2, 0x2e, 0x4b, 0xfe, 0x57,
	0x15, 0x77, 0x37, 0xe5, 0x9f, 0xf0, 0x4a, 0xda, 0x58, 0xc9, 0x29, 0x0a, 0xb1, 0xa0, 0x6b, 0x85,
	0xbd, 0x5d, 0x10, 0xf4, 0xcb, 0x3e, 0x05, 0x67, 0xe4, 0x27, 0x41, 0x8b, 0xa7, 0x7d, 0x95, 0xd8,
	0xfb, 0xee, 0x7c, 0x66, 0xdd, 0x17, 0x47, 0x9e, 0xca, 0x2d, 0xbf, 0x07, 0xad, 0x5a, 0x83, 0x33,
	0x63, 0x02, 0xaa, 0x71, 0xc8, 0x19, 0x49, 0xd9, 0xf2, 0xe3, 0x5b, 0x88, 0x9a, 0x26, 0x32, 0xb0,
	0xe9, 0x0f, 0xd5, 0x80, 0xbe, 0xcd, 0x34, 0x48, 0xff, 0x7a, 0x90, 0x5f, 0x20, 0x68, 0x1a, 0xae,
	0xb4, 0x54, 0x93, 0x22, 0x64, 0xf1, 0x73, 0x12, 0x40, 0x08, 0xc3, 0xec, 0xdb, 0xa1, 0x8d, 0x3d,
	0x97, 0x00, 0xcf, 0x2b, 0x76, 0x82, 0xd6, 0x1b, 0xb5, 0xaf, 0x6a, 0x50, 0x45, 0xf3, 0x30, 0xef,
	0x3f, 0x55, 0xa2, 0xea, 0x65, 0xba, 0x2f, 0xc0, 0xde, 0x1c, 0xfd, 0x4d, 0x92, 0x75, 0x06, 0x8a,
	0xb2, 0xe6, 0x0e, 0x1f, 0x62, 0xd4, 0xa8, 0x96, 0xf9, 0xc5, 0x25, 0x59, 0x84, 0x72, 0x39, 0x4c,
	0x5e, 0x78, 0x38, 0x8c, 0xd1, 0xa5, 0xe2, 0x61, 0xb3, 0x21, 0x9c, 0x1e, 0x43, 0xc7, 0xfc, 0x04,
	0x51, 0x99, 0x6d, 0x0d, 0xfa, 0xdf, 0x7e, 0x24, 0x3b, 0xab, 0xce, 0x11, 0x8f, 0x4e, 0xb7, 0xeb,
	0x3c, 0x81, 0x94, 0xf7, 0xb9, 0x13, 0x2c, 0xd3, 0xe7, 0x6e, 0xc4, 0x03, 0x56, 0x44, 0x7f, 0xa9,
	0x2a, 0xbb, 0xc1, 0x53, 0xdc, 0x0b, 0x9d, 0x6c, 0x31, 0x74, 0xf6, 0x46, 0xac, 0x89, 0x14, 0xe1,
	0x16, 0x3a, 0x69, 0x09, 0x70, 0xb6, 0xd0, 0xed, 0xcc, 0x42, 0x98, 0xa4, 0x28, 0x5c, 0xf8, 0x86
];

const ROUNDS = 10;
const W_POLYNOMIAL = 0x11d;

const PRECOMPUTE_CACHE = {};

function precompute(variant)
{
	const cached = PRECOMPUTE_CACHE[variant];
	if (cached)
	{
		return cached;
	}

	const C = [
		new Array(256),
		new Array(256),
		new Array(256),
		new Array(256),
		new Array(256),
		new Array(256),
		new Array(256),
		new Array(256)
	];
	
	const RC = new Array(ROUNDS + 1); // first index isn't used

	// Original WHIRLPOOL used different SBOX
	const SBOX = (variant === WHIRLPOOL_0 ? SBOX_0 : SBOX_T);
	for (let i = 0; i < 256; i++)
	{
		const s1 = SBOX[i];
		let s2 = s1 << 1;
		if (s2 >= 0x100)
		{
			s2 ^= W_POLYNOMIAL;
		}
		let s4 = s2 << 1;
		if (s4 >= 0x100)
		{
			s4 ^= W_POLYNOMIAL;
		}
		const s5 = s4 ^ s1;
		let s8 = s4 << 1;
		if (s8 >= 0x100)
		{
			s8 ^= W_POLYNOMIAL;
		}
		const s9 = s8 ^ s1;
		if (variant === WHIRLPOOL)
		{
			// Matrix was changed for the final WHIRLPOOL
			// C[0][i] = S[i].[1, 1, 4, 1, 8, 5, 2, 9];
			C[0][i] = {
				hi: s1 << 24 | s1 << 16 | s4 << 8 | s1,
				lo: s8 << 24 | s5 << 16 | s2 << 8 | s9
			};
		}
		else
		{
			const s3 = s2 ^ s1;
			// C[0][i] = S[i].[1, 1, 3, 1, 5, 8, 9, 5];
			C[0][i] = {
				hi: s1 << 24 | s1 << 16 | s3 << 8 | s1,
				lo: s5 << 24 | s8 << 16 | s9 << 8 | s5
			};
		}

		// C[t][i] = C[0][i] ror t * 8
		for (let t = 1; t < 8; t++)
		{
			C[t][i] = ror64(C[t - 1][i], 8);
		}
	}

	RC[0] = { hi: 0, lo: 0 };
	for (let r = 1; r <= ROUNDS; r++)
	{
		const i = 8 * (r - 1);
		RC[r] = {
			hi: (C[0][i    ].hi & 0xff000000) |
				(C[1][i + 1].hi & 0x00ff0000) |
				(C[2][i + 2].hi & 0x0000ff00) |
				(C[3][i + 3].hi & 0x000000ff),
			lo: (C[4][i + 4].lo & 0xff000000) |
				(C[5][i + 5].lo & 0x00ff0000) |
				(C[6][i + 6].lo & 0x0000ff00) |
				(C[7][i + 7].lo & 0x000000ff)
		};
	}

	const result = [C, RC];
	PRECOMPUTE_CACHE[variant] = result;

	return result;
}

class WhirlpoolTransform extends MdHashTransform
{
	constructor()
	{
		super(512, "BE", 32);

		this.addOption("variant", "Variant", "whirlpool", { type: "select", texts: VARIANT_NAMES, values: VARIANT_VALUES });
	}

	fill(arr)
	{
		for (let i = 0; i < arr.length; i++)
		{
			arr[i] = { hi: 0, lo: 0 };
		}
	}

	transform(bytes)
	{
		const [C, RC] = precompute(this.options.variant);

		const context = {
			hash: new Array(8),
			K: new Array(8),
			L: new Array(8),
			state: new Array(8),
			C, RC
		};

		this.fill(context.hash);
		this.fill(context.K);
		this.fill(context.L);

		this.transformBlocks(bytes, context);

		return int64sToBytesBE(context.hash);
	}

	transformBlock(blockBytes, context)
	{
		const { hash, K, L, state, C, RC } = context;
		const block = bytesToInt64sBE(blockBytes);

		for (let i = 0; i < 8; i++)
		{
			K[i].hi = hash[i].hi;
			K[i].lo = hash[i].lo;
			state[i] = xor64(block[i], K[i]);
		}

		for (let r = 1; r <= ROUNDS; r++)
		{
			for (let i = 0; i < 8; i++)
			{
				L[i].hi = 0;
				L[i].lo = 0;
				let s = 56;
				for (let t = 0; t < 8; t++)
				{
					const k = shr64(K[(i - t) & 7], s).lo & 0xff;
					L[i] = xor64(L[i], C[t][k]);
					s -= 8;
				}
			}

			for (let i = 0; i < 8; i++)
			{
				K[i].hi = L[i].hi;
				K[i].lo = L[i].lo;
			}

			K[0] = xor64(K[0], RC[r]);

			for (let i = 0; i < 8; i++)
			{
				L[i].hi = K[i].hi;
				L[i].lo = K[i].lo;
				let s = 56;
				for (let t = 0; t < 8; t++)
				{
					const si = shr64(state[(i - t) & 7], s).lo & 0xff;
					L[i] = xor64(L[i], C[t][si]);
					s -= 8;
				}
			}

			for (let i = 0; i < 8; i++)
			{
				state[i].hi = L[i].hi;
				state[i].lo = L[i].lo;
			}
		}

		for (let i = 0; i < 8; i++)
		{
			hash[i] = xor64(hash[i], state[i], block[i]);
		}
	}

}

export {
	WhirlpoolTransform
};