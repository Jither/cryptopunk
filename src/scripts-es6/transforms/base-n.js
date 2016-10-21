import { Transform, TransformError } from "./transforms";

class BaseNToBytesTransform extends Transform
{
	constructor(usesPadding)
	{
		super();
		this.usesPadding = usesPadding;

		this.addInput("string", "String")
			.addOutput("bytes", "Bytes");
		if (this.usesPadding)
		{
			this.addOption("inferPadding", "Infer padding", true);
		}
	}

	inferPadding(str)
	{
		const missingPadding = this.padCharCount - str.length % this.padCharCount;
		for (let i = 0; i < missingPadding; i++)
		{
			str += this.padChar;
		}
		return str;
	}

	strToNibbles(str)
	{
		let pad = 0;
		const result = str.split("").map(c =>
		{
			if (c === this.padChar)
			{
				pad++;
				return 0;
			}

			if (this.ignoreCase)
			{
				c = c.toLowerCase();
			}

			const index = this.alphabet.indexOf(c);
			if (index < 0)
			{
				throw new TransformError(`Character '${c}'' is not valid in this base.`);
			}
			return index;
		});

		return [result, pad];
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		// For now, no predetermined length, so no TypedArray
		const result = [];

		if (str === "")
		{
			return new Uint8Array();
		}

		const alphabet = this.alphabet;
		const base = alphabet.length;

		if (this.usesPadding && options.inferPadding)
		{
			str = this.inferPadding(str);
		}

		const [nibbles, pad] = this.strToNibbles(str);

		let length = nibbles.length;
		do
		{
			let value = 0;
			let position = 0;
			for (let i = 0; i < length; i++)
			{
				value = value * base + nibbles[i];
				if (value >= 256)
				{
					nibbles[position++] = Math.floor(value / 256);
					value %= 256;
				}
				else if (position > 0)
				{
					nibbles[position++] = 0;
				}
			}
			length = position;
			result.unshift(value);
		}
		while (length > 0);

		if (this.usesPadding)
		{
			const padBytes = Math.ceil(pad * this.padByteCount / this.padCharCount);
			result.splice(result.length - padBytes);
		}

		// TODO: Conversion for now - get this to work with Uint8Array internally
		return Uint8Array.from(result);
	}
}

class BytesToBaseNTransform extends Transform
{
	constructor(usesPadding)
	{
		super();
		this.usesPadding = usesPadding;
		this.addInput("bytes", "Bytes")
			.addOutput("string", "String");
		
		if (this.usesPadding)
		{
			this.addOption("pad", "Pad", true);
		}
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		if (bytes.length === 0)
		{
			return "";
		}

		let pad = 0;
		if (this.usesPadding)
		{
			pad = (this.padByteCount - (bytes.length % this.padByteCount)) % this.padByteCount;
		}
		// Combined: Add padding, but even if there isn't any, clone the bytes argument - we're mutating it below,
		// and don't want the parameter of the caller to change
		const buffer = new Uint8Array(bytes.length + pad);
		buffer.set(bytes);

		let result = "";
		const base = this.alphabet.length;
		const byteLength = buffer.length;

		let startIndex = 0;

		// FIXME: Handle trailing 0 bytes
		while (startIndex < byteLength)
		{
			let remainder = 0;

			for (let index = startIndex; index < byteLength; index++)
			{
				const dividend = buffer[index] + (remainder * 256);
				const quotient = Math.floor(dividend / base);
				remainder = dividend % base;
				buffer[index] = quotient;
			}
			result = this.alphabet[remainder] + result;

			// In the next iteration, skip all indices that have ended up zero:
			startIndex = 0;
			while (startIndex < byteLength && buffer[startIndex] === 0)
			{
				startIndex++;
			}
		}

		if (this.usesPadding)
		{
			// Remove "a" (0) padding
			const padChars = Math.floor(pad * this.padCharCount / this.padByteCount);
			result = result.substr(0, result.length - padChars);

			// Add "=" padding depending on option
			if (options.pad)
			{
				for (let i = 0; i < padChars; i++)
				{
					result += this.padChar;
				}
			}
		}
		return result;
	}
}

// Non-byte-aligning notations are easier to implement as Base-N.
// Hex and binary have their own implementations

class OctalToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super(false);
		this.alphabet = "01234567";
	}
}

class BytesToOctalTransform extends BytesToBaseNTransform
{
	constructor()
	{
		super(false);
		this.alphabet = "01234567";
	}
}

class DecimalToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super(false);
		this.alphabet = "0123456789";
	}
}

class BytesToDecimalTransform extends BytesToBaseNTransform
{
	constructor()
	{
		super(false);
		this.alphabet = "0123456789";
	}
}

class Base32ToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super(true);
		this.alphabet = "abcdefghijklmnopqrstuvwxyz234567";
		this.padChar = "=";
		this.padCharCount = 8;
		this.padByteCount = 5;
		this.ignoreCase = true;
	}
}

class Base32HexToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super(true);
		this.alphabet = "0123456789abcdefghijklmnopqrstuv";
		this.padChar = "=";
		this.padCharCount = 8;
		this.padByteCount = 5;
		this.ignoreCase = true;
	}
}

class Base64ToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super(true);
		this.alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		this.padChar = "=";
		this.padCharCount = 4;
		this.padByteCount = 3;
		this.ignoreCase = false;
	}
}

class Base64UrlToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super(true);
		this.alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
		this.padChar = "=";
		this.padCharCount = 4;
		this.padByteCount = 3;
		this.ignoreCase = false;
	}
}

class BytesToBase32Transform extends BytesToBaseNTransform
{
	constructor()
	{
		super(true);
		this.alphabet = "abcdefghijklmnopqrstuvwxyz234567";
		this.padChar = "=";
		this.padCharCount = 8;
		this.padByteCount = 5;
		this.ignoreCase = true;
	}
}

class BytesToBase32HexTransform extends BytesToBaseNTransform
{
	constructor()
	{
		super(true);
		this.alphabet = "0123456789abcdefghijklmnopqrstuv";
		this.padChar = "=";
		this.padCharCount = 8;
		this.padByteCount = 5;
		this.ignoreCase = true;
	}
}

class BytesToBase64Transform extends BytesToBaseNTransform
{
	constructor()
	{
		super(true);
		this.alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		this.padChar = "=";
		this.padCharCount = 4;
		this.padByteCount = 3;
		this.ignoreCase = false;
	}
}

class BytesToBase64UrlTransform extends BytesToBaseNTransform
{
	constructor()
	{
		super(true);
		this.alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
		this.padChar = "=";
		this.padCharCount = 4;
		this.padByteCount = 3;
		this.ignoreCase = false;
	}
}

/*
class BytesToBaseN
{
	constructor()
	{
		this.inputs = ["bytes"];
		this.outputs = ["str"];
	}

	transform(bytes, options)
	{

	}
}
*/

export {
	BytesToOctalTransform,
	OctalToBytesTransform,
	BytesToDecimalTransform,
	DecimalToBytesTransform,
	Base32ToBytesTransform,
	BytesToBase32Transform,
	Base32HexToBytesTransform,
	BytesToBase32HexTransform,
	Base64ToBytesTransform,
	BytesToBase64Transform,
	Base64UrlToBytesTransform,
	BytesToBase64UrlTransform
};