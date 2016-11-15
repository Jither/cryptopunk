import { BlockCipherTransform } from "./block-cipher";

const ROUNDS = 16;

// S-boxes
// Substitute an input nibble (4 bits) to an output nibble.
const SBOX_0 = [
	12, 15, 7, 10, 14, 13, 11, 0,
	2, 6, 3, 1, 9, 4, 5, 8
];

const SBOX_1 = [
	7, 2, 14, 9, 3, 11, 0, 4,
	12, 13, 1, 10, 6, 15, 8, 5
];

// Bit level permutation - permutes the "key interrupted" byte
// (XOR'ed key byte and "confused" message byte)
// Each item maps an input bit position to an output bit position: PR[input] = output
// Bit numbering is in LSB 0 order - that is, 76543210.
// In other words, bit 0 (the least significant bit) is permuted to bit 2, bit 1 to 5, etc.
const PR = [
	2, 5, 4, 0, 3, 1, 7, 6
];

// Byte level permutation - indicates which bytes of h0 will be XOR'ed with
// each bit of the key interrupted byte (AFTER it's been permuted). Bytes are 
// in big endian order.
// That is:
// - bit 0 (the least significant bit) will be XOR'ed with bit 0 of byte 7
// - bit 1 with bit 1 of byte 6
// - bit 2 with bit 2 of byte 2
// - bit 3 with bit 3 of byte 1
// - etc.
const O = [
	7, 6, 2, 1, 5, 0, 3, 4
];

function mirror(value, bits)
{
	let result = 0;
	for (let i = 0; i < bits; i++)
	{
		result <<= 1;
		result |= (value >>> i) & 1;
	}
	return result;
}

const VARIANT_NAMES = [
	"Original (LSB 0)",
	"Sorkin (MSB 0)"
];

const VARIANT_VALUES = [
	"lsb0",
	"msb0"
];

class LuciferTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("variant", "Variant", "lsb0", { type: "select", texts: VARIANT_NAMES, values: VARIANT_VALUES });
	}

	transform(bytes, keyBytes)
	{
		this.checkKeySize(keyBytes, 128);

		return this.transformBlocks(bytes, 128, keyBytes, this.options.variant);
	}

	transformBlock(block, dest, destOffset, keyBytes, variant)
	{
		let h0 = Uint8Array.from(block.subarray(0, 8));
		let h1 = Uint8Array.from(block.subarray(8));

		// For encryption, kc (starting byte position for the key bytes used for a round) will
		// follow the order: 0 7 14 5 12 3 10 1 8 15 6 13 4 11 2 9.
		// Starting from 0, and adding 1 for each key byte used, except the last.
		// In other words, 7 has been added by the end of each round.
		// Round 1:           0
		// Round 2:  0 + 7 =  7 (mod 16)
		// Round 3:  7 + 7 = 14 (mod 16)
		// Round 4: 14 + 7 =  5 (mod 16)
		// Etc.
		//
		// Decryption is reversed order, by starting from 8, and adding:
		// - 1 at the beginning of each round (making the starting point 9 for the first round) and
		// - 1 for each key byte used, *including* the last.
		// In other words, 9 in total has been added by the end of each round.
		// Round 1:               9
		// Round 2:  9 + 8 + 1 =  2 (mod 16)
		// Round 3:  2 + 8 + 1 = 11 (mod 16)
		// Round 4: 11 + 8 + 1 =  4 (mod 16)
		// Etc.
		let keyPosition = 0;
		if (this.decrypt)
		{
			// ""
			keyPosition = 8;
		}

		for (let round = 1; round <= ROUNDS; round++)
		{
			if (this.decrypt)
			{
				keyPosition = (keyPosition + 1) % 16;
			}

			// First byte of the (rotated) key is the transform control byte (tcb).
			const tcbPosition = keyPosition;

			// Iterate through the current 8 key/message bytes
			for (let i = 0; i < 8; i++)
			{
				// Split byte (of RIGHT message part) into two halves
				let l = h1[i] & 0x0f;
				let h = h1[i] >> 4;

				if (variant === "msb0")
				{
					// Original Sorkin mirrors the message bits when reading
					l = mirror(l, 4);
					h = mirror(h, 4);
				}

				// Read interchange control bit (icb) from the tcb.
				// MOST significant bit first - 76543210
				const icb = (keyBytes[tcbPosition] >> (7 - i)) & 1;

				// Swap nibbles if icb is set (1), don't if it's not.
				if (icb)
				{
					[l, h] = [h, l];
				}
				// In either case, substitute using the S-boxes, and recombine
				// the two 4-bit halves into a byte (v).
				let v;
				if (variant === "lsb0")
				{
					v = ((SBOX_0[h] << 4) | SBOX_1[l]);
				}
				else
				{
					// Original Sorkin uses S-box 1 for high half and S-box 0 for low half.
					v = ((SBOX_1[h] << 4) | SBOX_0[l]);
					// ... and also stores the resulting bits reversed
					v = mirror(v, 8);
				}

				// "Key interruption" (note that the transform control byte is "reused")
				const kiByte = v ^ keyBytes[keyPosition];

				// Permute the key interrupted byte and XOR ("add modulo 2")
				// each bit to the appropriate byte (decided by O) in the LEFT message half.
				for (let j = 0; j < 8; j++)
				{
					const kiBit = (kiByte >> (7 - PR[j])) & 1;

					const destByte = (O[j] + i) % 8;
					h0[destByte] ^= kiBit << (7 - j);
				}

				// "During encryption, the key rotates one step after each key byte is used,
				// except at the end of each round, when it does not advance"
				if (i < 7 || this.decrypt)
				{
					keyPosition = (keyPosition + 1) % 16;
				}
			}
			// Swap message halves
			const temp = h0;
			h0 = h1;
			h1 = temp;
		}
		dest.set(h1, destOffset);
		dest.set(h0, destOffset + 8);
	}
}

class LuciferEncryptTransform extends LuciferTransform
{
	constructor()
	{
		super(false);
	}
}

class LuciferDecryptTransform extends LuciferTransform
{
	constructor()
	{
		super(true);
	}
}

export {
	LuciferEncryptTransform,
	LuciferDecryptTransform
};