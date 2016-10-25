import { Transform } from "./transforms";

class KeyboardInputGenerator extends Transform
{
	constructor()
	{
		super();
		this.addOutput("string", "String")
			.addOption("input", "Input", "");
	}

	transform(options)
	{
		options = Object.assign({}, this.defaults, options);
		return options.input;
	}
}

class RandomBytesGenerator extends Transform
{
	constructor()
	{
		super();
		this.addOutput("bytes", "Bytes")
			.addOption("length", "Length", 16, { min: 1 });
	}

	transform(options)
	{
		options = Object.assign({}, this.defaults, options);
		const result = new Uint8Array(options.length);
		window.crypto.getRandomValues(result);

		return result;
	}
}

class NullBytesGenerator extends Transform
{
	constructor()
	{
		super();
		this.addOutput("bytes", "Bytes")
			.addOption("length", "Length", 16, { min: 1 });
	}

	transform(options)
	{
		options = Object.assign({}, this.defaults, options);
		// TypedArrays are initialized to zero
		const result = new Uint8Array(options.length);
		return result;
	}
}

export {
	KeyboardInputGenerator,
	RandomBytesGenerator,
	NullBytesGenerator
};