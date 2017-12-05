import { BlockCipherTransform } from "./block-cipher";
import { xorBytes } from "../../cryptopunk.bitarith";
import { getRijndaelSboxes } from "../shared/rijndael";
import { gfMulTable, gfExp2Table256 } from "../../cryptopunk.galois";
import { checkSize } from "../../cryptopunk.utils";
import { TransformError } from "../transforms";
import { gcd } from "../../cryptopunk.math";

// Rijndael uses a lot of Galois field math. Most of this can be reduced to table lookups - see rijndael_tables.js for an example.
// However, this implementation, like the others in this project, is intended to show what's actually going on math-wise.

const KEY_SIZES = [128, 160, 192, 224, 256];
const BLOCK_SIZES = [128, 160, 192, 224, 256];
const MAX_ROUNDS = 20;

const ROUND_COUNTS = [];
const ROUND_COUNT_NAMES = [];

function setupRoundChoices()
{
	ROUND_COUNTS.push(0);
	ROUND_COUNT_NAMES.push("Recommended");
	// At least 2 rounds:
	for (let i = 2; i <= MAX_ROUNDS; i++)
	{
		ROUND_COUNTS.push(i);
		ROUND_COUNT_NAMES.push(i.toString());
	}
}

setupRoundChoices();

// FIPS-recommended round counts by key size - or block size. The highest key/block size decides
const RECOMMENDED_ROUND_COUNTS = {
	128: 10,
	160: 11,
	192: 12,
	224: 13,
	256: 14
};

// The "Rijndael polynomial": x^8 + x^4 + x^3 + x + 1 = 0b100011011 = 0x11b
const RIJNDAEL_POLYNOMIAL = 0x11b;

// ShiftRows shifts for each block size:
const SHIFTS = {
	128: [0, 1, 2, 3],
	160: [0, 1, 2, 3],
	192: [0, 1, 2, 3],
	224: [0, 1, 2, 4],
	256: [0, 1, 3, 4]
};

// Substitution box and Inverse Substitution boxes:
let SBOX, ISBOX;
// GF multiplication lookups:
let MUL2, MUL3, MUL9, MULb, MULd, MULe;
// Round constants (basically 2^x exponential table)
let ROUND_CONSTANTS;

// Precalculates s-boxes and transformation tables
function precompute()
{
	if (SBOX)
	{
		// Already calculated
		return;
	}

	[SBOX, ISBOX] = getRijndaelSboxes();

	MUL2 = gfMulTable(0x02, RIJNDAEL_POLYNOMIAL);
	MUL3 = gfMulTable(0x03, RIJNDAEL_POLYNOMIAL);
	MUL9 = gfMulTable(0x09, RIJNDAEL_POLYNOMIAL);
	MULb = gfMulTable(0x0b, RIJNDAEL_POLYNOMIAL);
	MULd = gfMulTable(0x0d, RIJNDAEL_POLYNOMIAL);
	MULe = gfMulTable(0x0e, RIJNDAEL_POLYNOMIAL);

	// Round constants needed: 1 per 4 key schedule rounds
	// Number of key schedule rounds: (rounds + 1) * (block size / 32) - (key length / 32)
	// That means,
	// Max key schedule rounds = (max rounds + 1) * (max block length / 32) - (minimum key length / 32)
	//                         = (max rounds + 1) * (256 / 32) - (128 / 32)
	//                         = (max rounds + 1) * 8 - 4
	// We need one RC per 4 key schedule rounds, so divide by 4:
	const roundConstantsNeeded = Math.ceil(((MAX_ROUNDS + 1) * 8 - 4) / 4);
	ROUND_CONSTANTS = new Uint8Array(roundConstantsNeeded);
	const exp2 = gfExp2Table256(RIJNDAEL_POLYNOMIAL);

	ROUND_CONSTANTS[0] = 0x8d; // Never actually used
	for (let i = 1; i <= roundConstantsNeeded; i++)
	{
		ROUND_CONSTANTS[i] = exp2[i - 1];
	}
}

function addRoundKey(state, key)
{
	// AddRoundKey adds round key to state (mod 2, i.e. XOR)
	xorBytes(state, key);
}

function subBytes(state)
{
	// SubBytes substitutes bytes using the S-box
	for (let i = 0; i < state.length; i++)
	{
		state[i] = SBOX[state[i]];
	}
}

function invSubBytes(state)
{
	// InvSubBytes substitutes bytes using the inverted S-box
	for (let i = 0; i < state.length; i++)
	{
		state[i] = ISBOX[state[i]];
	}
}

function _shiftRow(state, columns, rowIndex, shift)
{
	const setCount = gcd(shift, columns);
	
	for (let start = 0; start < setCount; start++)
	{
		let dest = start;
		const temp = state[rowIndex + start * 4];

		for (;;)
		{
			const source = (dest + shift) % columns;
			if (source === start)
			{
				state[rowIndex + dest * 4] = temp;
				break;
			}
			state[rowIndex + dest * 4] = state[rowIndex + source * 4];
			dest = source;
		}
	}
}

function shiftRows(state)
{
	// ShiftRows circular shifts each row a predefined amount of bytes
	const columns = state.columns;
	const shifts = state.shifts;
	
	// We skip row 0, since its shift is always 0
	for (let rowIndex = 1; rowIndex < 4; rowIndex++)
	{
		const shift = shifts[rowIndex];
		_shiftRow(state, columns, rowIndex, shift);
	}
}

function invShiftRows(state)
{
	// InvShiftRows circular shifts each row a predefined amount of bytes
	const columns = state.columns;
	const shifts = state.shifts;
	
	// We skip row 0, since its shift is always 0
	for (let rowIndex = 1; rowIndex < 4; rowIndex++)
	{
		const shift = columns - shifts[rowIndex];
		_shiftRow(state, columns, rowIndex, shift);
	}
}

function mixColumns(state)
{
	// MixColumns works on each column, which is considered as a polynomial over GF(2^8) modulo x^4 + 1
	// The column is multiplied by the fixed polynomial c(x) = {03}*x^3 + {01}*x^2 + {01}*x + 1
	// This can instead be seen as multiplying a matrix with the column seen as a vector:
	//
	// [02 03 01 01]   [a0]
	// [01 02 03 01] * [a1]
	// [01 01 02 03]   [a2]
	// [03 01 01 02]   [a3]
	//
	// In other words:
	// b0 = {02} * a0 + {03} * a1 + {01} * a2 + {01} * a3
	// b1 = {01} * a0 + {02} * a1 + {03} * a2 + {01} * a3
	// b2 = {01} * a0 + {01} * a1 + {02} * a2 + {03} * a3
	// b3 = {03} * a0 + {01} * a1 + {01} * a2 + {02} * a3
	//
	// Remember that we're dealing with Galois field addition and multiplication.
	// With the MixColumns coefficients of {01}, {02} and {03}
	// these are relatively simple computations:
	//
	// {01} * x = x
	// {02} * x = x << 1 (reduced by Rijndael polynomial if exceeding 0xff, i.e. x xor 0x11b)
	// {03} * x = ({02} * x) xor x
	// {x} + {y} = x xor y

	const columns = state.columns;

	let index = 0;
	for (let col = 0; col < columns; col++)
	{
		const
			a0 = state[index],
			a1 = state[index + 1],
			a2 = state[index + 2],
			a3 = state[index + 3];

		state[index++] = MUL2[a0] ^ MUL3[a1] ^      a2  ^      a3 ;
		state[index++] =      a0  ^ MUL2[a1] ^ MUL3[a2] ^      a3 ;
		state[index++] =      a0  ^      a1  ^ MUL2[a2] ^ MUL3[a3];
		state[index++] = MUL3[a0] ^      a1  ^      a2  ^ MUL2[a3];
	}
}

function invMixColumns(state)
{
	// The inverse of the MixColumns matrix looks like this:
	//
	// [0e 0b 0d 09]   [a0]
	// [09 0e 0b 0d] * [a1]
	// [0d 09 0e 0b]   [a2]
	// [0b 0d 09 0e]   [a3]
	//
	// Less simple multiplication than MixColumns, but pretty much the same here, due to our Galois multiplication
	// lookup tables. Except there are no {01} multiplications that can be left out.

	const columns = state.columns;

	let index = 0;
	for (let col = 0; col < columns; col++)
	{
		const
			a0 = state[index],
			a1 = state[index + 1],
			a2 = state[index + 2],
			a3 = state[index + 3];

		state[index++] = MULe[a0] ^ MULb[a1] ^ MULd[a2] ^ MUL9[a3];
		state[index++] = MUL9[a0] ^ MULe[a1] ^ MULb[a2] ^ MULd[a3];
		state[index++] = MULd[a0] ^ MUL9[a1] ^ MULe[a2] ^ MULb[a3];
		state[index++] = MULb[a0] ^ MULd[a1] ^ MUL9[a2] ^ MULe[a3];
	}
}

class RijndaelBaseTransform extends BlockCipherTransform
{
	constructor(decrypt)
	{
		super(decrypt);
		this.addOption("blockSize", "Block size", 128, { type: "select", texts: BLOCK_SIZES })
			.addOption("rounds", "Rounds", 0, { type: "select", texts: ROUND_COUNT_NAMES, values: ROUND_COUNTS });
	}

	transform(bytes, keyBytes)
	{
		this.checkBytesSize("Key", keyBytes, KEY_SIZES);

		// Variable block size, but check the requirements:
		const blockSize = this.options.blockSize;
		const blockLength = blockSize / 8;
		const requirement = checkSize(blockSize, BLOCK_SIZES);
		if (requirement)
		{
			throw new TransformError(`Block size must be ${requirement} bits. Was ${blockSize} bits`);
		}

		// Precalculate s-boxes
		precompute();

		const keySize = keyBytes.length * 8;

		let rounds = this.options.rounds;
		if (rounds === 0)
		{
			// Get recommended round count based on key size or block size (higher size decides):
			rounds = RECOMMENDED_ROUND_COUNTS[keySize > blockSize ? keySize : blockSize];
		}

		const roundKeys = this.prepareRoundKeys(keyBytes, rounds, blockLength);

		return this.transformBlocks(bytes, blockSize, roundKeys, blockSize);
	}

	transformBlock(block, dest, destOffset, roundKeys, blockSize)
	{
		const state = Uint8Array.from(block);
		
		const rounds = roundKeys.length - 1;
		state.shifts = SHIFTS[blockSize];
		state.columns = state.length / 4;

		this.addRoundKey(state, roundKeys[0]);
		
		for (let r = 1; r < rounds; r++)
		{
			this.subBytes(state);
			this.shiftRows(state);
			this.mixColumns(state);
			this.addRoundKey(state, roundKeys[r]);
		}

		this.subBytes(state);
		this.shiftRows(state);
		this.addRoundKey(state, roundKeys[rounds]);
		
		dest.set(state, destOffset);
	}

	prepareRoundKeys(keyBytes, rounds, blockLength)
	{
		// Rijndael uses round keys the same length as the block length
		// It needs rounds + 1 keys
		// In the specification, round key generation is looked at as filling
		// in a matrix, W, with 4 byte rows and ((rounds + 1) * block length / 4) columns.
		// This abstraction allows a simpler algorithm because the user key will always
		// fit a whole number of columns, but may not fit a whole number of round keys.

		const rkNeeded = rounds + 1;
		const stateColumns = blockLength / 4;
		const columnsNeeded = rkNeeded * stateColumns;
		const keyLength = keyBytes.length;

		const w = new Uint8Array(columnsNeeded * 4);
		w.set(keyBytes);

		const keyColumns = keyLength / 4;
		// Start from the first column after the columns filled in by the user key:
		let columnIndex = keyColumns;

		let index = columnIndex * 4; // Byte index
		while (columnIndex < columnsNeeded)
		{
			if (columnIndex % keyColumns === 0)
			{
				const pcbIndex = (columnIndex - 1) * 4;
				const rc = ROUND_CONSTANTS[columnIndex / keyColumns];

				for (let i = 0; i < 4; i++)
				{
					// Get index of previous column; row 1,2,3,0:
					const prev = pcbIndex + (i + 1) % 4;
					w[index] = w[index - keyLength] ^ SBOX[w[prev]];
					// Apply round constant to first row:
					if (i === 0)
					{
						w[index] ^= rc;
					}
					index++;
				}
			}
			// For key sizes larger than 192 bit:
			else if (keyColumns > 6 && columnIndex % keyColumns === 4)
			{
				for (let i = 0; i < 4; i++)
				{
					w[index] = w[index - keyLength] ^ SBOX[w[index - 4]];
					index++;
				}
			}
			else
			{
				for (let i = 0; i < 4; i++)
				{
					w[index] = w[index - keyLength] ^ w[index - 4];
					index++;
				}
			}
			columnIndex++;
		}

		const roundKeys = new Array(rkNeeded);
		for (let i = 0; i < rkNeeded; i++)
		{
			const offset = i * blockLength;
			roundKeys[i] = w.subarray(offset, offset + blockLength);
			// Store column count for invMixRounds of key (for equivalent decryption)
			roundKeys[i].columns = stateColumns;
		}
		return roundKeys;
	}
}


class RijndaelEncryptTransform extends RijndaelBaseTransform
{
	constructor()
	{
		super(false);
		this.subBytes = subBytes;
		this.shiftRows = shiftRows;
		this.mixColumns = mixColumns;
		this.addRoundKey = addRoundKey;
	}
}

class RijndaelDecryptTransform extends RijndaelBaseTransform
{
	constructor()
	{
		super(true);
		// It can be shown that Encryption and Decryption can be exactly the same procedure, except for:
		// - using the inverse of SubBytes, ShiftRows and MixColumns,
		// - reversing the keys, and
		// - applying inverse MixColumns to (most of) the round keys (see below).
		// See "The Design of Rijndael" for more details.

		// Here, we assign the inverse functions:
		this.subBytes = invSubBytes;
		this.shiftRows = invShiftRows;
		this.mixColumns = invMixColumns;
		this.addRoundKey = addRoundKey;
	}

	prepareRoundKeys(keyBytes, rounds, blockLength)
	{
		const roundKeys = super.prepareRoundKeys(keyBytes, rounds, blockLength);
		
		// Applying inverse MixColumns to the round keys (except first and last) is the least
		// intuitive step to get equivalent Encryption and Decryption procedures. It allows us to swap
		// InvMixColumns and AddRoundKey. *Basically*, (Inv)MixColumns "simply" rearranges the bits of
		// each column. Applying InvMixColumns to the round key also, will rearrange its bits in the same way.
		//
		// The more mathematically correct explanation is that (Inv)MixColumns is a linear transformation,
		// and for any linear transformation, A(x xor y) = A(x) xor A(y). So:
		//
		// InvMixColumns(state xor key) = InvMixColumns(state) xor InvMixColumns(key)
		//
		// See "The Design of Rijndael" for more details.
		for (let i = 1; i < roundKeys.length - 1; i++)
		{
			invMixColumns(roundKeys[i]);
		}
		// Final step: Reverse the round keys
		roundKeys.reverse();
		return roundKeys;
	}
}

export {
	RijndaelEncryptTransform,
	RijndaelDecryptTransform
};