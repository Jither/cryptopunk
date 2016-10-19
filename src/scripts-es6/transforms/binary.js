import { Transform, TransformError } from "./transforms";
import { removeWhiteSpace} from "../cryptopunk.utils";

class BinaryToBytesTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Binary string")
			.addOutput("bytes", "Bytes")
			.addOption("ignoreWhiteSpace", "Ignore whitespace", true);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);
		if (options.ignoreWhiteSpace)
		{
			str = removeWhiteSpace(str);
		}

		// Can't predetermine length, so no TypedArray
		const result = [];
		let position = 0, value = 0;
		for (let i = str.length - 1; i >= 0; i--)
		{
			const digit = str.charCodeAt(i) - 48;
			if (digit < 0 || digit > 1)
			{
				const c = str.charCodeAt(i);
				throw new TransformError(`Character '${c}' is not valid binary notation.`);
			}
			value += digit << position;
			position += 1;

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

		// TODO: Conversion for now - attempt to get this to work with TypedArray internally
		return Uint8Array.from(result);
	}
}

class BytesToBinaryTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Bytes")
			.addOutput("string", "Binary string")
			.addOption("split", "Split into octets", true);
	}

	transform(bytes, options)
	{
		options = Object.assign({}, this.defaults, options);

		let result = "";
		for (let i = 0; i < bytes.length; i++)
		{
			if (options.split && i > 0)
			{
				result += " ";
			}
			const b = bytes[i];
			const octet = ("0000000" + b.toString(2)).substr(-8);
			result += octet;
		}
		return result;
	}
}

export {
	BinaryToBytesTransform,
	BytesToBinaryTransform
};