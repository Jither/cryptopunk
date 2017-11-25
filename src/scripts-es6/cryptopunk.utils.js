// Output byte array as list of hexadecimal byte values
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

// Output byte array as list of decimal byte values
// Sometimes useful for comparison to specs that don't use hex (e.g. SAFER)
function bytesToDec(bytes)
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
		result += ("  " + b.toString(10)).substr(-3);
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
	hex = hex.replace(/ /g, "");
	const bytes = new Uint8Array(Math.ceil(hex.length / 2));
	let destIndex = 0;
	for (let c = 0; c < hex.length; c += 2)
	{
		bytes[destIndex++] = parseInt(hex.substr(c, 2), 16);
	}
	return bytes;
}

function int16sToHex(ints)
{
	let result = "";
	for (let i = 0; i < ints.length; i++)
	{
		if (i > 0)
		{
			result += " ";
		}
		const int = ints[i];
		result += ("0000" + (int >>> 0).toString(16)).substr(-4);
	}
	return result;
}

function int32ToHex(int)
{
	return ("00000000" + (int >>> 0).toString(16)).substr(-8);
}

function int32sToHex(ints)
{
	let result = "";
	for (let i = 0; i < ints.length; i++)
	{
		if (i > 0)
		{
			result += " ";
		}
		const int = ints[i];
		result += int32ToHex(int);
	}
	return result;
}

function int64ToHex(int)
{
	return int32ToHex(int.hi) + "-" + int32ToHex(int.lo);
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
		result += int64ToHex(int);
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

function bytesToInt16sBE(bytes)
{
	const result = [];
	for (let i = 0; i < bytes.length; i += 2)
	{
		result.push(
			(bytes[i    ] <<  8) |
			(bytes[i + 1])
		);
	}
	return result;
}

function bytesToInt16sLE(bytes)
{
	const result = [];
	for (let i = 0; i < bytes.length; i += 2)
	{
		result.push(
			(bytes[i    ]) |
			(bytes[i + 1] << 8)
		);
	}
	return result;
}

function bytesToInt32sBE(bytes, dest)
{
	// TODO: Uint32Array - but make sure it's big endian
	const result = dest || [];
	for (let i = 0; i < bytes.length; i += 4)
	{
		result[i / 4] = (bytes[i] << 24) |
			(bytes[i + 1] << 16) |
			(bytes[i + 2] << 8) |
			(bytes[i + 3]);
	}
	return result;
}

function bytesToInt32sLE(bytes, dest)
{
	// TODO: Uint32Array - but make sure it's little endian
	const result = dest || [];
	for (let i = 0; i < bytes.length; i += 4)
	{
		result[i / 4] = (bytes[i]          ) |
			(bytes[i + 1] <<  8) |
			(bytes[i + 2] << 16) |
			(bytes[i + 3] << 24);
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

function bytesToInt64sLE(bytes)
{
	const result = [];
	for (let i = 0; i < bytes.length; i += 8)
	{
		result.push({
			lo:	(bytes[i]          ) |
				(bytes[i + 1] <<  8) |
				(bytes[i + 2] << 16) |
				(bytes[i + 3] << 24),
			hi:	(bytes[i + 4]      ) |
				(bytes[i + 5] <<  8) |
				(bytes[i + 6] << 16) |
				(bytes[i + 7] << 24)
		});
	}
	return result;
}

function int16sToBytesBE(ints)
{
	const result = new Uint8Array(ints.length * 2);
	let index = 0;
	for (let i = 0; i < ints.length; i++)
	{
		const value = ints[i];
		result[index++] = (value >> 8) & 0xff;
		result[index++] = (value) & 0xff;
	}
	return result;
}

function int16sToBytesLE(ints)
{
	const result = new Uint8Array(ints.length * 2);
	let index = 0;
	for (let i = 0; i < ints.length; i++)
	{
		const value = ints[i];
		result[index++] = (value) & 0xff;
		result[index++] = (value >> 8) & 0xff;
	}
	return result;
}

function int32sToBytesBE(ints, dest)
{
	const result = dest || new Uint8Array(ints.length * 4);
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

function int32sToBytesLE(ints, dest)
{
	const result = dest || new Uint8Array(ints.length * 4);
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

function int64sToBytesBE(ints, dest)
{
	const result = dest || new Uint8Array(ints.length * 8);
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

function int64sToBytesLE(ints, dest)
{
	const result = dest || new Uint8Array(ints.length * 8);
	let index = 0;
	for (let i = 0; i < ints.length; i++)
	{
		// TODO: Access with DataView?
		const value = ints[i];
		result[index++] = (value.lo) & 0xff;
		result[index++] = (value.lo >>  8) & 0xff;
		result[index++] = (value.lo >> 16) & 0xff;
		result[index++] = (value.lo >> 24) & 0xff;
		result[index++] = (value.hi) & 0xff;
		result[index++] = (value.hi >>  8) & 0xff;
		result[index++] = (value.hi >> 16) & 0xff;
		result[index++] = (value.hi >> 24) & 0xff;
	}
	return result;
}

// TODO: Get rid of this (only used by browser-native RSA)
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

// Read variable length words to byte array
function readNWord(bytes, index, length)
{
	if (length <= 4)
	{
		// Word fits in 32-bit
		let result = 0;
		for (let b = 0; b < length; b++)
		{
			result <<= 8;
			result |= bytes[index++];
		}
		return result;
	}
	else
	{
		// Word requires 64-bit JS nastiness
		let lo = 0, hi = 0;
		for (let b = 4; b < length; b++)
		{
			hi <<= 8;
			hi |= bytes[index++];
		}
		for (let b = 0; b < 4; b++)
		{
			lo <<= 8;
			lo |= bytes[index++];
		}
		return { hi, lo };
	}
}

// Write variable length words to byte array
function writeNWord(bytes, index, word, length)
{
	// Writing "backwards" (from end of destination to start) is easier.
	if (length <= 4)
	{
		let i = index + length - 1;
		while (i >= index)
		{
			bytes[i--] = word & 0xff;
			word >>>= 8;
		}
	}
	else
	{
		// Backwards writing means lo word written first, hi word last.
		let lo = word.lo;
		let hi = word.hi;
		let i = index + length - 1;
		const loIndex = index + length - 4;
		while (i >= loIndex)
		{
			bytes[i--] = lo & 0xff;
			lo >>>= 8;
		}
		while (i >= index)
		{
			bytes[i--] = hi & 0xff;
			hi >>>= 8;
		}
	}
}

function checkSize(size, requiredSize)
{
	if (Array.isArray(requiredSize))
	{
		if (requiredSize.indexOf(size) < 0)
		{
			let requirement;
			if (requiredSize.length > 1)
			{
				requirement = requiredSize.slice(0, -1).join(", ");
				requirement += " or " + requiredSize[requiredSize.length - 1];
			}
			else
			{
				requirement = requiredSize[0].toString();
			}
			return requirement;
		}
	}
	else if (requiredSize.min != null && requiredSize.max != null)
	{
		if (size < requiredSize.min || size > requiredSize.max)
		{
			return `between ${requiredSize.min} and ${requiredSize.max}`;
		}
	}
	else if (requiredSize.min != null)
	{
		if (size < requiredSize.min)
		{
			return `at least ${requiredSize.min}`;
		}
	}
	else if (requiredSize.max != null)
	{
		if (size > requiredSize.max)
		{
			return `at most ${requiredSize.max}`;
		}
	}
	else if (size !== requiredSize)
	{
		return requiredSize.toString();
	}

	if (requiredSize.step)
	{
		if (size % requiredSize.step !== 0)
		{
			return `divisible by ${requiredSize.step}`;
		}
	}

	return null;
}

/* eslint-disable no-console */
function cipherTest(encTransformClass, decTransformClass, plainHex, keyHex, expectedHex)
{
	function normalize(str)
	{
		return str.toUpperCase().replace(/\s+/g, "");
	}

	const enc = new encTransformClass();
	const plain = hexToBytes(plainHex);
	const key = hexToBytes(keyHex);
	const encResult = enc.transform(plain, key);
	const encResultHex = bytesToHex(encResult);
	console.log(encResultHex);
	if (expectedHex)
	{
		const matches = normalize(encResultHex) === normalize(expectedHex);
		if (matches)
		{
			console.log("Encryption matches");
		}
		else
		{
			console.error("Encryption failed - expected:", expectedHex, ". Got:", encResultHex);
		}
	}

	if (decTransformClass)
	{
		const dec = new decTransformClass();
		const decResult = dec.transform(encResult, key);
		const decResultHex = bytesToHex(decResult);
		console.log(decResultHex);
		const matches = normalize(decResultHex) === normalize(plainHex);
		if (matches)
		{
			console.log("Decryption matches");
		}
		else
		{
			console.error("Encryption failed - expected:", plainHex, ". Got:", decResultHex);
		}
	}
}
/* eslint-enable no-console */

export {
	asciiToBytes,
	bytesToHex,
	bytesToDec,
	bytesToInt16sBE,
	bytesToInt16sLE,
	bytesToInt32sBE,
	bytesToInt32sLE,
	bytesToInt64sBE,
	bytesToInt64sLE,
	checkSize,
	hexToBytes,
	intToByteArray,
	int16sToBytesBE,
	int16sToBytesLE,
	int32sToBytesBE,
	int32sToBytesLE,
	int32ToBytesBE,
	int32ToBytesLE,
	int64sToBytesBE,
	int64sToBytesLE,
	int16sToHex,
	int32ToHex,
	int32sToHex,
	int64ToHex,
	int64sToHex,

	readNWord,
	writeNWord,

	cipherTest
};