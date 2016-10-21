import { Transform, TransformError } from "./transforms";

class BaseNBaseTransform extends Transform
{
	constructor(alphabet)
	{
		super();

		this.alphabet = alphabet;
		this.radix = this.alphabet.length;
		this.bitsPerDigit = Math.log2(this.radix);
		this.padCharCount = 8;
		this.padByteCount = this.bitsPerDigit;
		while (this.padByteCount % 2 === 0)
		{
			this.padCharCount >>>= 1;
			this.padByteCount >>>= 1;
		}
		// If bits per digit is an integer, the radix is "bit aligned"
		this.bitAligned = this.bitsPerDigit % 1 === 0;
	}
}

class BaseNToBytesTransform extends BaseNBaseTransform
{
	constructor(alphabet, padChar, discardLeadingZeroes)
	{
		super(alphabet);

		this.discardLeadingZeroes = discardLeadingZeroes;

		this.addInput("string", "String")
			.addOutput("bytes", "Bytes");
		
		if (padChar != null)
		{
			this.usesPadding = true;
			this.padChar = padChar;
			this.addOption("inferPadding", "Infer padding", true);
		}
	}

	strToDigits(str, options)
	{
		let pad = 0;
		// Check for padding (e.g. '=' at end of base-64)
		for (let i = str.length - 1; i >= 0; i--)
		{
			if (str.charAt(i) !== this.padChar)
			{
				break;
			}
			pad++;
		}

		// Allocate digits array without padding - we'll add it later
		let result = new Array(str.length - pad);
		for (let i = 0; i < result.length; i++)
		{
			let c = str.charAt(i);
			if (this.ignoreCase)
			{
				c = c.toLowerCase();
			}

			const index = this.alphabet.indexOf(c);
			if (index < 0)
			{
				throw new TransformError(`Character '${c}'' is not valid in this base.`);
			}
			result[i] = index;
		}

		// Padding may be inferred - if so, it will override any user-entered padding
		if (this.usesPadding && options.inferPadding)
		{
			pad = (this.padCharCount - result.length % this.padCharCount) % this.padCharCount;
		}

		// Add padding digits, if any
		for (let i = 0; i < pad; i++)
		{
			result.push(0);
		}

		return [result, pad];
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		if (str === "")
		{
			return new Uint8Array();
		}

		const alphabet = this.alphabet;
		const radix = this.radix;

		const [digits, pad] = this.strToDigits(str, options);

		const resultLength = Math.ceil(digits.length * this.bitsPerDigit / 8);
		let result = new Uint8Array(resultLength);

		let digitsRemaining = digits.length;
		let resultPosition = result.length - 1;
		while (digitsRemaining > 0)
		{
			let value = 0;
			let position = 0;
			for (let i = 0; i < digitsRemaining; i++)
			{
				value = value * radix + digits[i];
				if (value >= 256)
				{
					digits[position++] = Math.floor(value / 256);
					value %= 256;
				}
				else if (position > 0)
				{
					digits[position++] = 0;
				}
			}
			digitsRemaining = position;
			result[resultPosition--] = value;
		}

		let resultStart = 0;
		let resultEnd = result.length;
		if (this.discardLeadingZeroes)
		{
			while (resultStart < result.length && result[resultStart] === 0)
			{
				resultStart++;
			}
		}

		if (this.usesPadding)
		{
			const padBytes = Math.ceil(pad * this.bitsPerDigit / 8);
			resultEnd -= padBytes;
		}

		return result.subarray(resultStart, resultEnd);
	}
}

class BytesToBaseNTransform extends BaseNBaseTransform
{
	constructor(alphabet, padChar, discardLeadingZeroes)
	{
		super(alphabet);
		
		this.discardLeadingZeroes = discardLeadingZeroes;

		this.addInput("bytes", "Bytes")
			.addOutput("string", "String");
		
		if (padChar != null)
		{
			this.usesPadding = true;
			this.padChar = padChar;
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
		const radix = this.radix;
		if (this.usesPadding)
		{
			pad = (this.padByteCount - (bytes.length % this.padByteCount)) % this.padByteCount;
		}
		// Combined: Add padding, but even if there isn't any, clone the bytes argument - we're mutating it below,
		// and don't want the parameter of the caller to change
		const buffer = new Uint8Array(bytes.length + pad);
		buffer.set(bytes);

		let result = "";
		const byteLength = buffer.length;

		let startIndex = 0;
		let bitPosition = 0;
		while (startIndex < byteLength)
		{
			let remainder = 0;

			for (let index = startIndex; index < byteLength; index++)
			{
				const dividend = buffer[index] + (remainder * 256);
				const quotient = Math.floor(dividend / radix);
				remainder = dividend % radix;
				buffer[index] = quotient;
			}
			result = this.alphabet[remainder] + result;

			bitPosition += this.bitsPerDigit;
			if (bitPosition >= 8)
			{
				bitPosition -= 8;
				startIndex++;
			}
		}

		if (this.usesPadding)
		{
			// Remove "A" (0) padding
			const padCount = Math.floor(pad * 8 / this.bitsPerDigit);
			result = result.substr(0, result.length - padCount);

			// Add "=" padding depending on option
			if (options.pad)
			{
				for (let i = 0; i < padCount; i++)
				{
					result += this.padChar;
				}
			}
		}

		if (this.discardLeadingZeroes)
		{
			result = result.replace(/^0+/, "");
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
		super("01234567", null, true);
	}
}

class BytesToOctalTransform extends BytesToBaseNTransform
{
	constructor()
	{
		super("01234567", null, true);
	}
}

class DecimalToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super("0123456789", null, true);
	}
}

class BytesToDecimalTransform extends BytesToBaseNTransform
{
	constructor()
	{
		super("0123456789", null, true);
	}
}

class Base32ToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super("abcdefghijklmnopqrstuvwxyz234567", "=");
		this.ignoreCase = true;
	}
}

class Base32HexToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super("0123456789abcdefghijklmnopqrstuv", "=");
		this.ignoreCase = true;
	}
}

class Base64ToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", "=");
		this.ignoreCase = false;
	}
}

class Base64UrlToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", "=");
		this.ignoreCase = false;
	}
}

class BytesToBase32Transform extends BytesToBaseNTransform
{
	constructor()
	{
		super("abcdefghijklmnopqrstuvwxyz234567", "=");
		this.ignoreCase = true;
	}
}

class BytesToBase32HexTransform extends BytesToBaseNTransform
{
	constructor()
	{
		super("0123456789abcdefghijklmnopqrstuv", "=");
		this.ignoreCase = true;
	}
}

class BytesToBase64Transform extends BytesToBaseNTransform
{
	constructor()
	{
		super("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", "=");
		this.ignoreCase = false;
	}
}

class BytesToBase64UrlTransform extends BytesToBaseNTransform
{
	constructor()
	{
		super("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_", "=");
		this.ignoreCase = false;
	}
}

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