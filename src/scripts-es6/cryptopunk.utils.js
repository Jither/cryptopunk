function escapeForRegex(str)
{
	return str.replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&");
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

function coprime(a, b)
{
	return gcd(a,b) === 1;
}

function bytesToHex(bytes)
{
	let result = "";
	if (!bytes)
	{
		return result;
	}
	for (let i = 0; i < bytes.length; i++)
	{
		if (i > 0)
		{
			result += " ";
		}
		const b = bytes[i];
		const octet = ("0" + b.toString(16)).substr(-2);
		result += octet;
	}
	return result;
}

function asciiToBytes(ascii)
{
	const bytes = [];
	for (let c = 0; c < ascii.length; c++)
	{
		bytes.push(ascii.charCodeAt(c));
	}
	return bytes;
}

function hexToBytes(hex)
{
	const bytes = [];
	for (let c = 0; c < hex.length; c += 2)
	{
		bytes.push(parseInt(hex.substr(c, 2), 16));
	}
	return bytes;
}

function bytesToInt32sBE(bytes)
{
	const result = [];
	for (let i = 0; i < bytes.length; i += 4)
	{
		result.push(
			(bytes[i]     << 24) |
			(bytes[i + 1] << 16) |
			(bytes[i + 2] <<  8) |
			(bytes[i + 3])
		);
	}
	return result;
}

function bytesToInt32sLE(bytes)
{
	const result = [];
	for (let i = 0; i < bytes.length; i += 4)
	{
		result.push(
			(bytes[i]          ) |
			(bytes[i + 1] <<  8) |
			(bytes[i + 2] << 16) |
			(bytes[i + 3] << 24)
		);
	}
	return result;
}

function int32sToBytesBE(ints)
{
	const result = [];
	for (let i = 0; i < ints.length; i++)
	{
		const value = ints[i];
		result.push((value >> 24) & 0xff);
		result.push((value >> 16) & 0xff);
		result.push((value >>  8) & 0xff);
		result.push((value) & 0xff);
	}
	return result;
}

function int32sToBytesLE(ints)
{
	const result = [];
	for (let i = 0; i < ints.length; i++)
	{
		const value = ints[i];
		result.push((value      ) & 0xff);
		result.push((value >>  8) & 0xff);
		result.push((value >> 16) & 0xff);
		result.push((value >> 24) & 0xff);
	}
	return result;
}

function int32ToBytesBE(value)
{
	const result = [];
	result.push((value >> 24) & 0xff);
	result.push((value >> 16) & 0xff);
	result.push((value >>  8) & 0xff);
	result.push((value) & 0xff);
	return result;
}

function int32ToBytesLE(value)
{
	const result = [];
	result.push((value      ) & 0xff);
	result.push((value >>  8) & 0xff);
	result.push((value >> 16) & 0xff);
	result.push((value >> 24) & 0xff);
	return result;
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

function intToByteArray(num)
{
	const result = [];

	while (num !== 0)
	{
		const byte = num & 0xff;
		result.unshift(byte);
		num = (num - byte) / 256;
	}

	return result;
}

function removeWhiteSpace(str)
{
	return str.replace(/\s+/g, "");
}

function repeatString(str, count)
{
	return new Array(count + 1).join(str);
}

const rxSymbolWithCombiningMarks = /([\0-\u02FF\u0370-\u1AAF\u1B00-\u1DBF\u1E00-\u20CF\u2100-\uD7FF\uE000-\uFE1F\uFE30-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])([\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]+)/g;
const rxSurrogatePair = /([\uD800-\uDBFF])([\uDC00-\uDFFF])/g;

function multiByteStringReverse(str)
{
	// Swap symbols with their combining marks so the combining marks go first
	str = str.replace(rxSymbolWithCombiningMarks, (all, first, second) => multiByteStringReverse(second) + first);
	// Swap surrogate pairs
	str = str.replace(rxSurrogatePair, "$2$1");

	let result = "";
	let index = str.length;
	while (index--)
	{
		result += str.charAt(index);
	}
	return result;
}

export {
	asciiToBytes,
	bytesToHex,
	bytesToInt32sBE,
	bytesToInt32sLE,
	coprime,
	escapeForRegex,
	gcd,
	hexToBytes,
	isPerfectSquare,
	intToByteArray,
	int32sToBytesBE,
	int32sToBytesLE,
	int32ToBytesBE,
	int32ToBytesLE,
	mod,
	multiByteStringReverse,
	removeWhiteSpace,
	repeatString
};