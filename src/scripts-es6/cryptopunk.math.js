function isCoPrime(a, b)
{
	return gcd(a,b) === 1;
}

// Finds greatest common divisor of two numbers (Euclidean algorithm)
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

// Finds the multplicative inverse of a mod m
function modularInverse(a, m)
{
	if (a == null || m == null)
	{
		throw new Error("Invalid arguments to inverseMod");
	}

	// Extended Euclidian algorithm finds Bézout identity
	// (we don't need the second Bézout coefficient or the actual gcd):
	let t = 0,
		newT = 1,
		r = m,
		newR = a;

	while (newR !== 0)
	{
		const quotient = Math.floor(r / newR);
		[t, newT] = [newT, t - quotient * newT];
		[r, newR] = [newR, r - quotient * newR];
	}
	if (r > 1)
	{
		return null;
	}
	if (t < 0)
	{
		t += m;
	}
	return t;
}

export {
	isCoPrime,
	gcd,
	gfLog2Tables,
	isPerfectCube,
	isPerfectSquare,
	mod,
	modularInverse
};