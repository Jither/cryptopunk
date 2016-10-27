import { Transform } from "../transforms";

class XorTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input");
		this.addInput("bytes", "Key");
		this.addOutput("bytes", "Output");
		this.addOption("repeatKey", "Repeat key", true);
	}

	transform(bytes, keyBytes, options)
	{
		options = Object.assign({}, this.defaults, options);
		const result = new Uint8Array(bytes.length);

		let keyPosition = 0;
		for (let i = 0; i < bytes.length; i++)
		{
			let b = bytes[i];
			if (keyPosition < keyBytes.length)
			{
				b ^= keyBytes[keyPosition++];
			}
			result[i] = b;
			if (options.repeatKey && keyPosition >= keyBytes.length)
			{
				keyPosition = 0;
			}
		}

		return result;
	}
}

export {
	XorTransform
};