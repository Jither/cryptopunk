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
function modInv(a, m)
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

function modSquare(a, m)
{
	let bits = a,
		sum = a,
		carry = 0,
		result = 0;

	while (bits !== 0)
	{
		if (bits & 1)
		{
			const partial = (result + sum) >>> 0;
			if (partial < result || partial < sum)
			{
				carry = 1;
			}
			result = partial;
			while (result > m || carry)
			{
				result = (result - m) >>> 0;
				carry = 0;
			}
		}
		if (sum & 0x80000000)
		{
			carry = 1;
		}
		sum <<= 1;

		while (sum > m || carry)
		{
			sum -= m;
			carry = 0;
		}
		bits >>>= 1;
	}
	return result;
}

export {
	isCoPrime,
	gcd,
	isPerfectCube,
	isPerfectSquare,
	mod,
	modInv,
	modSquare
};