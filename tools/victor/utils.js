"use strict";

function applyEscapes(str)
{
	str = str.replace(/\\x([a-fA-F0-9]{2})/g, (match, hex) => {
		return String.fromCharCode(parseInt(hex, 16));
	});
	str = str.replace(/\\u([a-fA-F0-9]{4})/g, (match, hex) => {
		return String.fromCharCode(parseInt(hex, 16));
	});
	str = str.replace(/\\u\{([a-fA-F0-9]{1,})\}/g, (match, hex) => {
		return String.fromCodePoint(parseInt(hex, 16));
	});
	str = str.replace(/\\(.)/g, (match, escapeChar) => {
		switch (escapeChar)
		{
			case "b": return "\b";
			case "f": return "\f";
			case "n": return "\n";
			case "r": return "\r";
			case "t": return "\t";
			case "v": return "\v";
			case "\\": return "\\";
			default: return escapeChar;
		}
	});
	return str;
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
	applyEscapes,
	asciiToBytes,
	bytesToHex,
	hexToBytes
};