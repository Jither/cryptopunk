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
	const bytes = new Uint8Array(ascii.length);
	for (let c = 0; c < ascii.length; c++)
	{
		bytes[c] = ascii.charCodeAt(c);
	}
	return bytes;
}

function hexToBytes(hex)
{
	const bytes = new Uint8Array(Math.ceil(hex.length / 2));
	let destIndex = 0;
	for (let c = 0; c < hex.length; c += 2)
	{
		bytes[destIndex++] = parseInt(hex.substr(c, 2), 16);
	}
	return bytes;
}

function int64sToHex(ints)
{
	let result = "";
	if (!ints)
	{
		return result;
	}
	for (let i = 0; i < ints.length; i++)
	{
		if (i > 0)
		{
			result += " ";
		}
		const int = ints[i];
		result += ("00000000" + (int.hi >>> 0).toString(16)).substr(-8) + "-";
		result += ("00000000" + (int.lo >>> 0).toString(16)).substr(-8);
	}
	return result;
}

function int32ToBytesBE(value)
{
	const result = new Uint8Array(4);
	result[0] = (value >> 24) & 0xff;
	result[1] = (value >> 16) & 0xff;
	result[2] = (value >>  8) & 0xff;
	result[3] = value & 0xff;
	return result;
}

function int32ToBytesLE(value)
{
	const result = new Uint8Array(4);
	result[0] = value & 0xff;
	result[1] = (value >>  8) & 0xff;
	result[2] = (value >> 16) & 0xff;
	result[3] = (value >> 24) & 0xff;
	return result;
}

function bytesToInt32sBE(bytes)
{
	// TODO: Uint32Array - but make sure it's big endian
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
	// TODO: Uint32Array - but make sure it's little endian
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
	const result = new Uint8Array(ints.length * 4);
	let index = 0;
	for (let i = 0; i < ints.length; i++)
	{
		// TODO: Access with DataView?
		const value = ints[i];
		result[index++] = (value >> 24) & 0xff;
		result[index++] = (value >> 16) & 0xff;
		result[index++] = (value >>  8) & 0xff;
		result[index++] = (value) & 0xff;
	}
	return result;
}

function int32sToBytesLE(ints)
{
	const result = new Uint8Array(ints.length * 4);
	let index = 0;
	for (let i = 0; i < ints.length; i++)
	{
		// TODO: Access with DataView?
		const value = ints[i];
		result[index++] = value & 0xff;
		result[index++] = (value >>  8) & 0xff;
		result[index++] = (value >> 16) & 0xff;
		result[index++] = (value >> 24) & 0xff;
	}
	return result;
}

function bytesToInt64sBE(bytes)
{
	const result = [];
	for (let i = 0; i < bytes.length; i += 8)
	{
		result.push({
			hi:	(bytes[i]     << 24) |
				(bytes[i + 1] << 16) |
				(bytes[i + 2] <<  8) |
				(bytes[i + 3]),
			lo:	(bytes[i + 4] << 24) |
				(bytes[i + 5] << 16) |
				(bytes[i + 6] <<  8) |
				(bytes[i + 7]),
		});
	}
	return result;
}

function int64sToBytesBE(ints)
{
	const result = new Uint8Array(ints.length * 8);
	let index = 0;
	for (let i = 0; i < ints.length; i++)
	{
		// TODO: Access with DataView?
		const value = ints[i];
		result[index++] = (value.hi >> 24) & 0xff;
		result[index++] = (value.hi >> 16) & 0xff;
		result[index++] = (value.hi >>  8) & 0xff;
		result[index++] = (value.hi) & 0xff;
		result[index++] = (value.lo >> 24) & 0xff;
		result[index++] = (value.lo >> 16) & 0xff;
		result[index++] = (value.lo >>  8) & 0xff;
		result[index++] = (value.lo) & 0xff;
	}
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
	const result = new Uint8Array();

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
	bytesToInt64sBE,
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
	int64sToBytesBE,
	int64sToHex,
	mod,
	multiByteStringReverse,
	removeWhiteSpace,
	repeatString
};