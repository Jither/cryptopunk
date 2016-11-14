import { Transform, TransformError } from "../transforms";
import { RX_CONTROL_CODES } from "../../cryptopunk.strings";

// Returns full 32 bit Unicode code point (based on up to two javascript character (UCS-2))
function getCodePoint(str, index)
{
	let code = str.charCodeAt(index++);

	// Combine surrogate pairs
	if (code >= 0xd800 && code <= 0xdbff && index < str.length)
	{
		const code2 = str.charCodeAt(index);
		if (code2 >= 0xdc00 && code2 <= 0xdfff)
		{
			code = ((code - 0xd800) << 10) + (code2 - 0xdc00) + 0x10000;
			index++;
		}
		else
		{
			// Invalid
			// TODO: Issue warning
		}
	}
	return [code, index];
}

function codePointToStr(code)
{
	let result = "";
	if (code > 0xffff)
	{
		code -= 0x10000;
		result += String.fromCharCode(((code >> 10) & 0x3ff) | 0xd800);
		result += String.fromCharCode((code & 0x3ff) | 0xdc00);
	}
	else
	{
		result += String.fromCharCode(code);
	}
	return result;
}

class Utf8ToBytesTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "String")
			.addOutput("bytes", "Bytes");
	}

	transform(str)
	{
		// Can't predetermine length, so no TypedArray here
		const result = [];
		let i = 0;
		while (i < str.length)
		{
			let code;
			[code, i] = getCodePoint(str, i);

			if (code <= 0x7f)
			{
				result.push(code);
			}
			else if (code <= 0x07ff)
			{
				result.push(0xc0 | (code >> 6));
				result.push(0x80 | (code & 0x3f));
			}
			else if (code <= 0xffff)
			{
				result.push(0xe0 | (code >> 12));
				result.push(0x80 | ((code >> 6) & 0x3f));
				result.push(0x80 | (code & 0x3f));
			}
			else if (code <= 0x10ffff)
			{
				result.push(0xf0 | (code >> 18));
				result.push(0x80 | ((code >> 12) & 0x3f));
				result.push(0x80 | ((code >> 6) & 0x3f));
				result.push(0x80 | (code & 0x3f));
			}
		}
		// TODO: Conversion for now - try to get this to work internally with Uint8Array.
		return Uint8Array.from(result);
	}
}

class BytesToUtf8Transform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Bytes")
			.addOutput("string", "String")
			.addOption("stripCC", "Strip control codes", true);
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		let result = "";
		let i = 0;
		while (i < bytes.length)
		{
			let code = 0;
			let byte = bytes[i++];

			let continuations;
			if ((byte & 0b11111000) === 0b11110000)
			{
				code = byte & 0b00000111;
				continuations = 3;
			}
			else if ((byte & 0b11110000) === 0b11100000)
			{
				code = byte & 0b00001111;
				continuations = 2;
			}
			else if ((byte & 0b11100000) === 0b11000000)
			{
				code = byte & 0b00011111;
				continuations = 1;
			}
			else if ((byte & 0b10000000) === 0b0000000)
			{
				code = byte & 0b01111111;
				continuations = 0;
			}
			else
			{
				throw new TransformError(`Invalid byte in UTF-8 sequence: ${byte.toString(16)}`);
			}

			if (i + continuations > bytes.length)
			{
				throw new TransformError(`Not enough continuation bytes`);
			}

			for (let cindex = 0; cindex < continuations; cindex++)
			{
				byte = bytes[i++];
				if ((byte & 0b11000000) !== 0b10000000)
				{
					throw new TransformError(`Invalid continuation byte in UTF-sequence: ${byte.toString(16)}`);
				}
				code <<= 6;
				code |= byte & 0b00111111;
			}

			result += codePointToStr(code);
		}

		if (options.stripCC)
		{
			result = result.replace(RX_CONTROL_CODES, "");
		}
		return result;
	}
}


class Ucs2ToBytesTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "String")
			.addOutput("bytes", "Bytes")
			.addOption("littleEndian", "Little Endian", false);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);
		const result = new Uint8Array(str.length * 2);
		let destIndex = 0;
		for (let i = 0; i < str.length; i++)
		{
			const code = str.charCodeAt(i);
			if (options.littleEndian)
			{
				result[destIndex++] = code & 0xff;
				result[destIndex++] = code >> 8;
			}
			else
			{
				result[destIndex++] = code >> 8;
				result[destIndex++] = code & 0xff;
			}
		}
		return result;
	}
}

class BytesToUcs2Transform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Bytes")
			.addOutput("string", "String")
			.addOption("littleEndian", "Little Endian", false)
			.addOption("stripCC", "Strip control codes", true);
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);
		let result = "";
		for (let i = 0; i < bytes.length; i += 2)
		{
			const code = options.littleEndian ?
				bytes[i + 1] << 8 | bytes[i] :
				bytes[i] << 8 | bytes[i + 1];
			result += String.fromCharCode(code);
		}

		if (options.stripCC)
		{
			result = result.replace(RX_CONTROL_CODES, "");
		}

		return result;
	}
}

class Utf16ToBytesTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "String")
			.addOutput("bytes", "Bytes")
			.addOption("littleEndian", "Little Endian", false);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);
		// Can't predetermine length, so no TypedArray
		const result = [];
		let i = 0;
		while (i < str.length)
		{
			let code;
			[code, i] = getCodePoint(str, i);

			let high, low;
			if (code <= 0xffff)
			{
				high = 0;
				low = code;
			}
			else
			{
				const sp = code - 0x10000;
				high = 0xd800 + (sp >> 10);
				low = 0xdc00 + (sp & 0x3ff);
			}

			if (options.littleEndian)
			{
				if (high === 0)
				{
					result.push(low & 0xff);
					result.push((low & 0xff00) >> 8);
				}
				else
				{
					result.push(high & 0xff);
					result.push((high & 0xff00) >> 8);
					result.push(low & 0xff);
					result.push((low & 0xff00) >> 8);
				}
			}
			else
			{
				if (high === 0)
				{
					result.push((low & 0xff00) >> 8);
					result.push(low & 0xff);
				}
				else
				{
					result.push((high & 0xff00) >> 8);
					result.push(high & 0xff);
					result.push((low & 0xff00) >> 8);
					result.push(low & 0xff);
				}
			}
		}
		// TODO: Conversion for now - try to get this to work with Uint8Array
		return Uint8Array.from(result);
	}
}

class BytesToUtf16Transform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Bytes")
			.addOutput("string", "String")
			.addOption("littleEndian", "Little Endian", false)
			.addOption("stripCC", "Strip control codes", true);
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);
		let result = "";
		for (let i = 0; i < bytes.length; i += 2)
		{
			const code = options.littleEndian ?
				bytes[i + 1] << 8 | bytes[i] :
				bytes[i] << 8 | bytes[i + 1];
			result += String.fromCharCode(code);
		}

		if (options.stripCC)
		{
			result = result.replace(RX_CONTROL_CODES, "");
		}

		return result;
	}
}

export {
	Utf8ToBytesTransform,
	Ucs2ToBytesTransform,
	Utf16ToBytesTransform,
	BytesToUtf8Transform,
	BytesToUcs2Transform,
	BytesToUtf16Transform
};