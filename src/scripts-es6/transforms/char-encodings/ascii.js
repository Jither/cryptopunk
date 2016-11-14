import { Transform, TransformError } from "../transforms";
import { RX_CONTROL_CODES } from "../../cryptopunk.strings";

class AsciiToBytesTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "String")
			.addOutput("bytes", "Bytes");
	}

	transform(str)
	{
		const result = new Uint8Array(str.length);
		for (let i = 0; i < str.length; i++)
		{
			const code = str.charCodeAt(i);
			if (code > 127)
			{
				const c = str.charAt(i);
				throw new TransformError(`Character '${c}' is not valid ASCII.`);
			}
			result[i] = code;
		}
		return result;
	}
}

class BytesToAsciiTransform extends Transform
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
		for (let i = 0; i < bytes.length; i++)
		{
			const code = bytes[i];
			let c = String.fromCharCode(code);

			if (code > 127) 
			{
				c = "\ufffd";
			}
			result += c;
		}
		if (options.stripCC)
		{
			result = result.replace(RX_CONTROL_CODES, "");
		}

		return result;
	}
}

export {
	BytesToAsciiTransform,
	AsciiToBytesTransform
};