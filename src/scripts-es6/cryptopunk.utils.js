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
	hex = hex.replace(/ /g, "");
	const bytes = new Uint8Array(Math.ceil(hex.length / 2));
	let destIndex = 0;
	for (let c = 0; c < hex.length; c += 2)
	{
		bytes[destIndex++] = parseInt(hex.substr(c, 2), 16);
	}
	return bytes;
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

function int64sToBytesLE(ints)
{
	const result = new Uint8Array(ints.length * 8);
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

function checkSize(size, requiredSize)
{
	if (Array.isArray(requiredSize))
	{
		if (requiredSize.indexOf(size) < 0)
		{
			let requirement = requiredSize.slice(0, -1).join(", ");
			if (requirement.length > 1)
			{
				requirement += " or " + requiredSize[requiredSize.length - 1];
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

	return null;
}

export {
	asciiToBytes,
	bytesToHex,
	bytesToInt16sBE,
	bytesToInt32sBE,
	bytesToInt32sLE,
	bytesToInt64sBE,
	bytesToInt64sLE,
	checkSize,
	hexToBytes,
	intToByteArray,
	int16sToBytesBE,
	int32sToBytesBE,
	int32sToBytesLE,
	int32ToBytesBE,
	int32ToBytesLE,
	int64sToBytesBE,
	int64sToBytesLE,
	int32ToHex,
	int32sToHex,
	int64ToHex,
	int64sToHex
};