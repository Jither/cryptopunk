import { Transform, TransformError } from "./transforms";
import { removeWhiteSpace, repeatString } from "../cryptopunk.utils";

const UNITS = {
	"byte (8 bits)": "byte",
	"short (16 bits)": "short",
	"int (32 bits)": "int"
};

class NumbersToBytesTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Numbers")
			.addOutput("bytes", "Bytes")
			.addOption("unit", "Unit", "byte", { type: "select", values: UNITS });
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
			case "short":
				return 65535;
			case "int":
				return 4294967295;
			default:
				throw new TransformError(`Unknown unit: ${unit}`);
		}
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		str = str.trim();

		if (str === "")
		{
			return new Uint8Array();
		}

		const max = this.unitToMax(options.unit);

		this.checkStringAgainstBase(str);

		const numbers = str.split(/\s+/g);

		let byteLength;
		switch (options.unit)
		{
			case "byte": byteLength = numbers.length; break;
			case "short": byteLength = numbers.length * 2; break;
			case "int": byteLength = numbers.length * 4; break;

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
				throw new TransformError(`Value (${num}) is above the maximum size of the selected unit (${options.unit})`);
			}

			switch (options.unit)
			{
				case "byte":
					result[destIndex++] = value;
					break;
				case "short":
					result[destIndex++] = (value >> 8) & 0xff;
					result[destIndex++] = value & 0xff;
					break;
				case "int":
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
			.addOption("unit", "Unit", "byte", { type: "select", values: UNITS })
			.addOption("pad", "Pad", true)
			.addOption("separator", "Separator", " ");
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		const separator = options.separator;
		const unit = options.unit;
		const pad = options.pad;
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
			case "short": byteCount = 2; break;
			case "int": byteCount = 4; break;
			default: throw new TransformError(`Unknown unit: ${options.unit}`);
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
			byte: repeatString("0", 8),
			short: repeatString("0", 16),
			int: repeatString("0", 32)
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
			byte: repeatString("0", 3),
			short: repeatString("0", 6),
			int: repeatString("0", 11)
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
			byte: repeatString("0", 3),
			short: repeatString("0", 5),
			int: repeatString("0", 10)
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
			byte: repeatString("0", 2),
			short: repeatString("0", 4),
			int: repeatString("0", 8)
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