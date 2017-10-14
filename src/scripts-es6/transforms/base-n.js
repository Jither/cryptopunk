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
	constructor(alphabet, padChar)
	{
		super(alphabet);

		this.addInput("string", "String")
			.addOutput("bytes", "Bytes");
		
		if (padChar != null)
		{
			this.usesPadding = true;
			this.padChar = padChar;
			this.addOption("inferPadding", "Infer padding", true);
		}
	}

	strToDigits(str)
	{
		const inferPadding = this.options.inferPadding;

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
		const result = new Array(str.length - pad);
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
		if (this.usesPadding && inferPadding)
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

	transform(str)
	{
		if (str === "")
		{
			return new Uint8Array();
		}

		const radix = this.radix;

		const [digits, pad] = this.strToDigits(str);

		const resultLength = Math.ceil(digits.length * this.bitsPerDigit / 8);
		const result = new Uint8Array(resultLength);

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

		let resultEnd = result.length;

		if (this.usesPadding)
		{
			const padBytes = Math.ceil(pad * this.bitsPerDigit / 8);
			resultEnd -= padBytes;
		}

		return result.subarray(0, resultEnd);
	}
}

class BytesToBaseNTransform extends BaseNBaseTransform
{
	constructor(alphabet, padChar)
	{
		super(alphabet);
		
		this.addInput("bytes", "Bytes")
			.addOutput("string", "String");
		
		if (padChar != null)
		{
			this.usesPadding = true;
			this.padChar = padChar;
			this.addOption("pad", "Pad", true);
		}
	}

	transform(bytes)
	{
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

		let bitsPosition = 0;
		while (startIndex < byteLength)
		{
			let remainder = 0;
			for (let index = startIndex; index < byteLength; index++)
			{
				const dividend = buffer[index] + (remainder * 256);
				remainder = dividend % radix;
				const quotient = Math.floor(dividend / radix);
				buffer[index] = quotient;
			}
			result = this.alphabet[remainder] + result;

			bitsPosition += this.bitsPerDigit;
			if (bitsPosition >= 8)
			{
				bitsPosition -= 8;
				startIndex++;
			}
		}

		if (this.usesPadding)
		{
			// Remove "A" (0) padding
			const padCount = Math.floor(pad * 8 / this.bitsPerDigit);
			result = result.substr(0, result.length - padCount);

			// Add "=" padding depending on option
			if (this.options.pad)
			{
				for (let i = 0; i < padCount; i++)
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

class NumericBaseNToBytesTransform extends BaseNToBytesTransform
{
	constructor(alphabet)
	{
		super(alphabet, null, true);
	}

	transform(str)
	{
		const result = super.transform(str);
		return this.removeLeadingZeroes(result, str);
	}

	removeLeadingZeroes(result)
	{
		let resultStart = 0;
		while (resultStart < result.length && result[resultStart] === 0)
		{
			resultStart++;
		}

		return result.subarray(resultStart);
	}
}

class NumericBytesToBaseNTransform extends BytesToBaseNTransform
{
	constructor(alphabet)
	{
		super(alphabet, null);
	}

	transform(bytes)
	{
		const result = super.transform(bytes);
		return result.replace(/^0+/, "");
	}
}

class OctalToBytesTransform extends NumericBaseNToBytesTransform
{
	constructor()
	{
		super("01234567");
	}
}

class BytesToOctalTransform extends NumericBytesToBaseNTransform
{
	constructor()
	{
		super("01234567");
	}

}

class DecimalToBytesTransform extends NumericBaseNToBytesTransform
{
	constructor()
	{
		super("0123456789");
	}
}

class BytesToDecimalTransform extends NumericBytesToBaseNTransform
{
	constructor()
	{
		super("0123456789");
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

class BytesToBase32Transform extends BytesToBaseNTransform
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

class BytesToBase32HexTransform extends BytesToBaseNTransform
{
	constructor()
	{
		super("0123456789abcdefghijklmnopqrstuv", "=");
		this.ignoreCase = true;
	}
}

const BASE58_VARIANT_NAMES = [
	"Bitcoin",
	"Ripple",
	"Flickr"
];

const BASE58_VARIANT_VALUES = [
	"bitcoin",
	"ripple",
	"flickr"
];

class Base58ToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		// Dummy, but has the correct size, so that we can simply change this.alphabet for variants
		super("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", null);
		this.defaults.inferPadding = false;
		this.addOption("variant", "Variant", "bitcoin", { type: "select", texts: BASE58_VARIANT_NAMES, values: BASE58_VARIANT_VALUES });
	}

	transform(str)
	{
		switch (this.options.variant)
		{
			case "bitcoin": this.alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; break;
			case "ripple": this.alphabet = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz"; break;
			case "flickr": this.alphabet = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"; break;
		}

		// Count leading zeroes:
		const zero = this.alphabet[0];
		let encodedZeroes = 0;
		while (encodedZeroes < str.length && str.charAt(encodedZeroes) === zero)
		{
			encodedZeroes++;
		}

		// Don't transform leading zeroes:
		const result = super.transform(str.substr(encodedZeroes));

		return this.fixLeadingZeroes(result, encodedZeroes);
	}

	fixLeadingZeroes(result, encodedZeroes)
	{
		// Count leading zeroes in result
		let zeroes = 0;
		while (zeroes < result.length && result[zeroes] === 0)
		{
			zeroes++;
		}
		if (encodedZeroes === 0)
		{
			if (zeroes === 0)
			{
				// No zeroes to add, none to remove
				return result;
			}
			// Remove leading zeroes from transformation
			return result.subarray(zeroes);
		}
		// Remove leading zeroes from transformation AND add leading zeroes from original base-58 string:
		const fixedResult = new Uint8Array(result.length - zeroes + encodedZeroes);
		fixedResult.set(result.subarray(zeroes), encodedZeroes);
		return fixedResult;
	}
}

class BytesToBase58Transform extends BytesToBaseNTransform
{
	constructor()
	{
		// Dummy, but has the correct size, so that we can simply change this.alphabet for variants
		super("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", null);
		this.addOption("variant", "Variant", "bitcoin", { type: "select", texts: BASE58_VARIANT_NAMES, values: BASE58_VARIANT_VALUES });
	}

	transform(bytes)
	{
		switch (this.options.variant)
		{
			case "bitcoin": this.alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; break;
			case "ipfs": this.alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"; break;
			case "ripple": this.alphabet = "rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz"; break;
			case "flickr": this.alphabet = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"; break;
		}

		const result = super.transform(bytes);

		return this.removeLeadingZeroes(result, bytes);
	}

	removeLeadingZeroes(result, bytes)
	{
		let zeroes = 0;
		while (zeroes < bytes.length && bytes[zeroes] === 0)
		{
			zeroes++;
		}
		
		const zero = this.alphabet[0];
		
		let skip = 0;
		while (result[skip] === zero)
		{
			skip++;
		}
		return result.substr(skip - zeroes);
	}
}

class Base62ToBytesTransform extends BaseNToBytesTransform
{
	constructor()
	{
		super("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", null);
		this.ignoreCase = false;
	}
}

class BytesToBase62Transform extends BytesToBaseNTransform
{
	constructor()
	{
		super("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", null);
		this.ignoreCase = false;
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

class BytesToBase64Transform extends BytesToBaseNTransform
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
	Base58ToBytesTransform,
	BytesToBase58Transform,
	Base62ToBytesTransform,
	BytesToBase62Transform,
	Base64ToBytesTransform,
	BytesToBase64Transform,
	Base64UrlToBytesTransform,
	BytesToBase64UrlTransform
};