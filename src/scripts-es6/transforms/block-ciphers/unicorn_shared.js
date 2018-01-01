import { gfExp256, gfAffine } from "../../cryptopunk.galois";

let SBOX1, SBOX2, SBOX3, SBOX4;

function precomputeSbox(matrix, c, modulo, d)
{
	const result = new Uint8Array(256);
	for (let x = 0; x < 256; x++)
	{
		// (x + c) ^ -1 (in GF(2^8)):
		const a = gfExp256(x ^ c, 254, modulo);
		// a * matrix + d (in GF(2^8)):
		result[x] = gfAffine(a, matrix, d);
	}

	return result;
}

function precomputeSboxes()
{
	if (SBOX1)
	{
		return;
	}

	SBOX1 = precomputeSbox([0x23, 0x4e, 0x9c, 0xb1, 0x49, 0xd8, 0xc6, 0xe4], 233, 0x11d,  28);
	SBOX2 = precomputeSbox([0x7e, 0x2a, 0xef, 0x52, 0x34, 0xa2, 0x70, 0xd7],  26, 0x165, 171);
	SBOX3 = precomputeSbox([0x32, 0x04, 0x8f, 0x83, 0x89, 0x67, 0xcf, 0x3b],  43, 0x14d, 155);
	SBOX4 = precomputeSbox([0x34, 0x20, 0xba, 0xd0, 0x66, 0xd7, 0xb2, 0xa8], 200, 0x171,  47);
}

export {
	SBOX1,
	SBOX2,
	SBOX3,
	SBOX4,
	precomputeSboxes
};