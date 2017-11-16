import { Transform, TransformError } from "./transforms";
import { removeWhiteSpace } from "../cryptopunk.strings";

const UNIT_NAMES = [
	"byte (8 bits)",
	"word (16 bits)",
	"dword (32 bits)"
];

const UNIT_VALUES = [
	"byte",
	"word",
	"dword"
];

class NumbersToBytesTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Numbers")
			.addOutput("bytes", "Bytes")
			.addOption("unit", "Unit", "byte", { type: "select", texts: UNIT_NAMES, values: UNIT_VALUES });
	}

	checkStringAgainstBase(str)
	{
		str = removeWhiteSpace(str);
		const invalidCharIndex = str.search(this.charCheckRegex);
		if (invalidCharIndex >= 0)
		{
			const c = str.charAt(invalidCharIndex);
			throw new TransformError(`Invalid character in input: ${c}`);
		}
	}

	unitToMax(unit)
	{
		switch (unit)
		{
			case "byte":
				return 255;
			case "word":
				return 65535;
			case "dword":
				return 4294967295;
			default:
				throw new TransformError(`Unknown unit: ${unit}`);
		}
	}

	transform(str)
	{
		const unit = this.options.unit;
		str = str.trim();

		if (str === "")
		{
			return new Uint8Array();
		}

		const max = this.unitToMax(unit);

		this.checkStringAgainstBase(str);

		const numbers = str.split(/\s+/g);

		let byteLength;
		switch (unit)
		{
			case "byte": byteLength = numbers.length; break;
			case "word": byteLength = numbers.length * 2; break;
			case "dword": byteLength = numbers.length * 4; break;
		}
		const result = new Uint8Array(byteLength);

		let destIndex = 0;
		for (let i = 0; i < numbers.length; i++)
		{
			const num = numbers[i];
			const value = parseInt(num, this.base);
			if (isNaN(value))
			{
				throw new TransformError(`Value (${num}) cannot be converted to a base ${this.base} value`);
			}
			if (value > max)
			{
				throw new TransformError(`Value (${num}) is above the maximum size of the selected unit (${unit})`);
			}

			switch (unit)
			{
				case "byte":
					result[destIndex++] = value;
					break;
				case "word":
					result[destIndex++] = (value >> 8) & 0xff;
					result[destIndex++] = value & 0xff;
					break;
				case "dword":
					result[destIndex++] = (value >> 24) & 0xff;
					result[destIndex++] = (value >> 16) & 0xff;
					result[destIndex++] = (value >> 8) & 0xff;
					result[destIndex++] = value & 0xff;
					break;
			}
		}

		return result;
	}
}

class BytesToNumbersTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Bytes")
			.addOutput("string", "Numbers")
			.addOption("unit", "Unit", "byte", { type: "select", values: UNIT_VALUES, texts: UNIT_NAMES })
			.addOption("pad", "Pad", true)
			.addOption("separator", "Separator", " ");
	}

	transform(bytes)
	{
		const separator = this.options.separator;
		const unit = this.options.unit;
		const pad = this.options.pad;
		const padding = this.padding[unit];

		let result = "";

		if (bytes.length === 0)
		{
			return result;
		}

		let byteCount = 1;
		switch (unit)
		{
			case "byte": break;
			case "word": byteCount = 2; break;
			case "dword": byteCount = 4; break;
			default: throw new TransformError(`Unknown unit: ${unit}`);
		}

		let i = 0;
		while (i < bytes.length)
		{
			if (i > 0)
			{
				result += separator;
			}
			let value = 0;
			for (let n = 0; n < byteCount; n++)
			{
				value *= 256;
				value += bytes[i++];
				if (i >= bytes.length)
				{
					break;
				}
			}

			let number = value.toString(this.base);
			if (pad)
			{
				number = (padding + number).substr(-padding.length);
			}

			result += number;
		}

		return result;
	}
}

class BinaryNumbersToBytesTransform extends NumbersToBytesTransform
{
	constructor()
	{
		super();
		this.base = 2;
		this.charCheckRegex = /[^01]/;
	}
}

class OctalNumbersToBytesTransform extends NumbersToBytesTransform
{
	constructor()
	{
		super();
		this.base = 8;
		this.charCheckRegex = /[^0-7]/;
	}
}

class DecimalNumbersToBytesTransform extends NumbersToBytesTransform
{
	constructor()
	{
		super();
		this.base = 10;
		this.charCheckRegex = /[^0-9]/;
	}
}

class HexNumbersToBytesTransform extends NumbersToBytesTransform
{
	constructor()
	{
		super();
		this.base = 16;
		this.charCheckRegex = /[^0-9a-f]/i;
	}
}

class BytesToBinaryNumbersTransform extends BytesToNumbersTransform
{
	constructor()
	{
		super();
		this.base = 2;
		this.padding = {
			byte: "0".repeat(8),
			word: "0".repeat(16),
			dword: "0".repeat(32)
		};
	}
}

class BytesToOctalNumbersTransform extends BytesToNumbersTransform
{
	constructor()
	{
		super();
		this.base = 8;
		this.padding = {
			byte: "0".repeat(3),
			word: "0".repeat(6),
			dword: "0".repeat(11)
		};
	}
}

class BytesToDecimalNumbersTransform extends BytesToNumbersTransform
{
	constructor()
	{
		super();
		this.base = 10;
		this.padding = {
			byte: "0".repeat(3),
			word: "0".repeat(5),
			dword: "0".repeat(10)
		};
	}
}

class BytesToHexNumbersTransform extends BytesToNumbersTransform
{
	constructor()
	{
		super();
		this.base = 16;
		this.padding = {
			byte: "0".repeat(2),
			word: "0".repeat(4),
			dword: "0".repeat(8)
		};
	}
}

export {
	BinaryNumbersToBytesTransform,
	OctalNumbersToBytesTransform,
	DecimalNumbersToBytesTransform,
	HexNumbersToBytesTransform,
	BytesToBinaryNumbersTransform,
	BytesToOctalNumbersTransform,
	BytesToDecimalNumbersTransform,
	BytesToHexNumbersTransform
};