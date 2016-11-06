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

function coprime(a, b)
{
	return gcd(a,b) === 1;
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

// True modulo - works for negative numbers too
function mod(n, m)
{
	return ((n % m) + m) % m;
}

export {
	coprime,
	gcd,
	isPerfectSquare,
	mod
};