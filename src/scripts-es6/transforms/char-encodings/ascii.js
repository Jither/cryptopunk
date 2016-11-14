import { Transform, TransformError } from "../transforms";

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
			.addOutput("string", "String");
	}

	transform(bytes)
	{
		let result = "";
		for (let i = 0; i < bytes.length; i++)
		{
			const code = bytes[i];
			let c = String.fromCharCode(code);

			if (code < 32)
			{
				if (code !== 13 && code !== 10 && code !== 9)
				{
					continue;
				}
			}
			else if (code > 126) // 127 is non-printable <DEL>
			{
				c = "\ufffd";
			}
			result += c;
		}
		return result;
	}
}

export {
	BytesToAsciiTransform,
	AsciiToBytesTransform
};