function coprime(a, b)
{
	return gcd(a,b) === 1;
}

// Finds greatest common divisor of two numbers
function gcd(a, b)
{
	// a should be largest
	if (a < b)
	{
		[a, b] = [b, a];
	}
	
	while (b !== 0)
	{
		const t = b;
		b = a % b;
		a = t;
	}
	return a;
}

// Returns two tables for a GF(2^8) field:
// - logarithm table for log2(i)
// - anti-logarithm table for 2^i
// ... using the given irreducible polynomial as modulo
function gfLog2Tables(modulo)
{
	const log = new Array(256);
	const alog = new Array(256);

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

function isPerfectSquare(n)
{
	if (n < 0)
	{
		return false;
	}

	const rt = Math.floor(Math.sqrt(n) + 0.5);
	return rt * rt === n;
}

function isPerfectCube(n)
{
	if (n < 0)
	{
		return false;
	}

	const rt = Math.floor(Math.cbrt(n) + 0.5);
	return rt * rt * rt === n;
}

// True modulo - works for negative numbers too
function mod(n, m)
{
	return ((n % m) + m) % m;
}

export {
	coprime,
	gcd,
	gfLog2Tables,
	isPerfectCube,
	isPerfectSquare,
	mod
};