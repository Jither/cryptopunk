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

export {
	gfExp2Table256,
	gfLog2Tables256,
	gfMulTable,
	gfMul
};