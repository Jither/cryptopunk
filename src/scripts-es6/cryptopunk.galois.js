import { parity8 } from "./cryptopunk.bitarith";

// Returns two tables for a GF(2^8) field:
// - logarithm table for log2(i)
// - exponential (anti-logarithm) table for 2^i
// ... using the given irreducible polynomial as modulo
function gfLog2Tables256(modulo)
{
	const log = new Uint8Array(256);
	const alog = new Uint8Array(256);

	log[0] = 0;
	let alogValue = alog[0] = 1;
	for (let i = 1; i < 256; i++)
	{
		alogValue <<= 1;
		if (alogValue & 0x100)
		{
			alogValue ^= modulo;
		}
		alog[i] = alogValue;
		log[alogValue] = i < 255 ? i : 0;
	}

	return [log, alog];
}

// Returns exponential (anti-logarithm) table for 2^i in a GF(2^8) field
// ... using the given irreducible polynomial as modulo
function gfExp2Table256(modulo)
{
	const exp = new Uint8Array(256);

	let expValue = exp[0] = 1;
	for (let i = 1; i < 256; i++)
	{
		expValue <<= 1;
		if (expValue & 0x100)
		{
			expValue ^= modulo;
		}
		exp[i] = expValue;
	}

	return exp;
}

function gfExp256(x, n, modulo)
{
	if (x === 0)
	{
		return 0;
	}
	if (x === 1)
	{
		return x;
	}
	let result = 1;
	while (n)
	{
		if (n & 1)
		{
			result = gfMul(result, x, modulo);
		}
		n >>>= 1;
		if (n)
		{
			x = gfMul(x, x, modulo);
		}
	}
	return result;
}

// Returns a*b mod modulo in GF(size)
// Default size = 256
function gfMul(a, b, modulo, size)
{
	size = size || 256;

	let result = 0;
	while (b !== 0)
	{
		if ((b & 1) !== 0)
		{
			result ^= a;
		}
		a <<= 1;
		if (a >= size)
		{
			a ^= modulo;
		}
		b >>>= 1;
	}
	return result;
}

// Generates multiplication table for a*b mod modulo in GF(size)
// Default size = 256
function gfMulTable(a, modulo, size)
{
	size = size || 256;
	
	const result = new Array(size);
	for (let i = 0; i < size; i++)
	{
		result[i] = gfMul(a, i, modulo, size);
	}

	return result;
}

// Affine transformation in GF(2^8), i.e.:
// A*x + b
// Where A is an 8x8 bit matrix (represented as 8 bytes in row order)
// ... and b is a bit vector (a byte)
// Vectors and rows are Most Significant Byte First.
// (Note that this is the opposite of the usual Rijndael byte notation
// - for entries of A; x; b; and result)
// e.g.:
//          A                    b
// [ 1 0 0 0 1 1 1 1 ]          [1]   [ 1 0 0 0 1 0 1 0 ] ^ 1 = 0
// [ 1 1 0 0 0 1 1 1 ]          [1]   [ 1 1 0 0 0 0 1 0 ] ^ 1 = 0
// [ 1 1 1 0 0 0 1 1 ]          [0]   [ 1 1 0 0 0 0 1 0 ] ^ 0 = 1
// [ 1 1 1 1 0 0 0 1 ] * {CA} + [0]   [ 1 1 0 0 0 0 0 0 ] ^ 0 = 0 = {00101110} = {2E}
// [ 1 1 1 1 1 0 0 0 ]          [0]   [ 1 1 0 0 1 0 0 0 ] ^ 0 = 1
// [ 0 1 1 1 1 1 0 0 ]          [1]   [ 0 1 0 0 1 0 0 0 ] ^ 1 = 1
// [ 0 0 1 1 1 1 1 0 ]          [1]   [ 0 0 0 0 1 0 1 0 ] ^ 1 = 1
// [ 0 0 0 1 1 1 1 1 ]          [0]   [ 0 0 0 0 1 0 1 0 ] ^ 0 = 0
//
// ... is represented as:
// x      = 0xca
// matrix = [0x8f, 0xc7, 0xe3, 0xf1, 0xf8, 0x7c, 0x3e, 0x1f]
// b      = 0xc6
// result = 0x2e
//
// This example is equivalent to calculating the Rijndael affine transformation for:
// x = 0x53 (0xca bit-reversed)
// b = 0x63 (0xc6 bit-reversed)
// result = 0x74 (0x2e bit-reversed)
function gfAffine(x, matrix, b)
{
	let result = 0;
	for (let i = 0; i < 8; i++)
	{
		let p = parity8(x & matrix[i]);
		p ^= (b & 0x80) ? 1 : 0;
		b <<= 1;
		result <<= 1;
		result |= p;
	}
	return result;
}

export {
	gfExp2Table256,
	gfLog2Tables256,
	gfMulTable,
	gfExp256,
	gfMul,
	gfAffine
};