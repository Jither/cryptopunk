import { BlockCipherTransform } from "./block-cipher";
import { SBOX, SBOX_0 } from "./anubis";
import { gfMulTable } from "../../cryptopunk.galois";
import { xorBytes } from "../../cryptopunk.bitarith";

const VARIANT_VALUES = [
	"khazad-0",
	"khazad"
];

const VARIANT_NAMES = [
	"KHAZAD-0",
	"KHAZAD"
];

// Khazad (and tweak) shares S-boxes with Anubis (and tweak)
const SBOXES = {
	"khazad-0": SBOX_0,
	"khazad": SBOX
};

const KHAZAD_POLYNOMIAL = 0x11d;

// Generator matrix for mix:
const GEN_MATRIX = [
	[1, 3, 4, 5, 6, 8, 11, 7],
	[3, 1, 5, 4, 8, 6, 7, 11],
	[4, 5, 1, 3, 11, 7, 6, 8],
	[5, 4, 3, 1, 7, 11, 8, 6],
	[6, 8, 11, 7, 1, 3, 4, 5],
	[8, 6, 7, 11, 3, 1, 5, 4],
	[11, 7, 6, 8, 4, 5, 1, 3],
	[7, 11, 8, 6, 5, 4, 3, 1]
];

let MULTIPLIERS;

function precompute()
{
	if (MULTIPLIERS)
	{
		return;
	}

	const MUL3 = gfMulTable(3, KHAZAD_POLYNOMIAL);
	const MUL4 = gfMulTable(4, KHAZAD_POLYNOMIAL);
	const MUL5 = gfMulTable(5, KHAZAD_POLYNOMIAL);
	const MUL6 = gfMulTable(6, KHAZAD_POLYNOMIAL);
	const MUL7 = gfMulTable(7, KHAZAD_POLYNOMIAL);
	const MUL8 = gfMulTable(8, KHAZAD_POLYNOMIAL);
	const MULb = gfMulTable(11, KHAZAD_POLYNOMIAL);

	MULTIPLIERS = [];
	const multipliers = [null, null, null, MUL3, MUL4, MUL5, MUL6, MUL7, MUL8, null, null, MULb];

	for (const row of GEN_MATRIX)
	{
		const mulRow = new Array(8);
		for (let i = 0; i < row.length; i++)
		{
			const mul = row[i];
			mulRow[i] = mul ? multipliers[mul] : null;
		}
		MULTIPLIERS.push(mulRow);
	}
}

// Nonlinear layer γ ("SubBytes")
function subBytes(state, sbox)
{
	// Substitute using S-box:
	for (let i = 0; i < state.length; i++)
	{
		state[i] = sbox[state[i]];
	}
}

// Linear diffusion θ
function mix(state)
{
	// Multiply (in GF(2^8)) by:
	// [01 03 04 05 06 08 0b 07]
	// [03 01 05 04 08 06 07 0b]
	// [04 05 01 03 0b 07 06 08]
	// [05 04 03 01 07 0b 08 06]
	// [06 08 0b 07 01 03 04 05]
	// [08 06 07 0b 03 01 05 04]
	// [0b 07 06 08 04 05 01 03]
	// [07 0b 08 06 05 04 03 01]
	const b = new Uint8Array(8); // Uint8Array.from(state);

	for (let row = 0; row < 8; row++)
	{
		const muls = MULTIPLIERS[row];
		const a = state[row];
		for (let col = 0; col < 8; col++)
		{
			const mul = muls[col];
			b[col] ^= mul ? mul[a] : a;
		}
	}
	state.set(b);
}

class KhazadTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("variant", "Variant", "khazad", { type: "select", values: VARIANT_VALUES, texts: VARIANT_NAMES });
		this.addOption("rounds", "Rounds", 8, { min: 1 });
	}

	transform(bytes, keyBytes)
	{
		precompute();

		this.checkBytesSize("Key", keyBytes, 128);

		const roundKeys = this.prepareRoundKeys(keyBytes, this.options.rounds);

		return this.transformBlocks(bytes, 64, roundKeys);
	}

	prepareRoundKeys(keyBytes, rounds)
	{
		const k = new Array(rounds + 1);
		const sbox = SBOXES[this.options.variant];

		k[-2] = keyBytes.subarray(0, 8);
		k[-1] = keyBytes.subarray(8, 16);

		for (let r = 0; r < rounds + 1; r++)
		{
			k[r] = Uint8Array.from(k[r - 1]);
			subBytes(k[r], sbox);
			mix(k[r]);

			for (let i = 0; i < 8; i++)
			{
				const cr = sbox[8 * r + i];
				k[r][i] ^= cr;
			}
			xorBytes(k[r], k[r - 2]);
		}

		return k;
	}

	transformBlock(block, dest, destOffset, roundKeys)
	{
		const state = Uint8Array.from(block);

		const sbox = SBOXES[this.options.variant];

		const rounds = roundKeys.length - 1;

		// Key addition σ[K0]
		xorBytes(state, roundKeys[0]);

		// N-1 rounds:
		for (let r = 1; r < rounds; r++)
		{
			subBytes(state, sbox);
			mix(state);
			xorBytes(state, roundKeys[r]);
		}

		// Last round:
		subBytes(state, sbox);
		xorBytes(state, roundKeys[rounds]);

		dest.set(state, destOffset);
	}
}


class KhazadEncryptTransform extends KhazadTransform
{
	constructor()
	{
		super(false);
	}
}

class KhazadDecryptTransform extends KhazadTransform
{
	constructor()
	{
		super(true);
	}

	// Invert key schedule for decryption:
	prepareRoundKeys(keyBytes, rounds)
	{
		const roundKeys = super.prepareRoundKeys(keyBytes, rounds);

		// Replace RK 1 to N-1 with θ(RK):
		for (let r = 1; r < rounds; r++)
		{
			mix(roundKeys[r]);
		}

		// Reverse order of round keys:
		roundKeys.reverse();

		return roundKeys;
	}
}

export {
	KhazadEncryptTransform,
	KhazadDecryptTransform
};