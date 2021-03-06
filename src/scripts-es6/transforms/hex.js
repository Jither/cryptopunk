import { Transform, TransformError } from "./transforms";
import { removeWhiteSpace } from "../cryptopunk.strings";

class HexToBytesTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Hex string")
			.addOutput("bytes", "Bytes")
			.addOption("ignoreWhiteSpace", "Ignore whitespace", true);
	}

	transform(str)
	{
		if (this.options.ignoreWhiteSpace)
		{
			str = removeWhiteSpace(str);
		}

		// Can't predetermine length, so no TypedArray
		const result = [];
		let position = 0, value = 0;
		for (let i = str.length - 1; i >= 0; i--)
		{
			const c = str.charAt(i);
			const digit = "0123456789abcdef".indexOf(c.toLowerCase());
			if (digit < 0)
			{
				throw new TransformError(`Character '${c}' is not valid hexadecimal notation.`);
			}
			value += digit << position;
			position += 4;

			if (position >= 8)
			{
				result.unshift(value);
				value = 0;
				position = 0;
			}
		}
		if (position > 0)
		{
			result.unshift(value);
		}
		// TODO: Conversion for now - try to get this to work with TypedArray internally
		return Uint8Array.from(result);
	}
}

class BytesToHexTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Bytes")
			.addOutput("string", "Hex string")
			.addOption("split", "Split into octets", true);
	}

	transform(bytes)
	{
		const split = this.options.split;

		let result = "";
		for (let i = 0; i < bytes.length; i++)
		{
			if (split && i > 0)
			{
				result += " ";
			}
			const b = bytes[i];
			const octet = ("0" + b.toString(16)).substr(-2);
			result += octet;
		}
		return result;
	}
}

export {
	HexToBytesTransform,
	BytesToHexTransform
};