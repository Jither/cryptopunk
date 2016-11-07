"use strict";

function asciiToBytes(ascii)
{
	const bytes = new Uint8Array(ascii.length);
	for (let c = 0; c < ascii.length; c++)
	{
		bytes[c] = ascii.charCodeAt(c);
	}
	return bytes;
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
		if (i > 0 && (i % 4 == 0))
		{
			result += " ";
		}
		const b = bytes[i];
		const octet = ("0" + b.toString(16)).substr(-2);
		result += octet;
	}
	return result;
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

module.exports = {
	asciiToBytes,
	bytesToHex,
	hexToBytes
};