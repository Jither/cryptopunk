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
			.addOption("length", "Length", 16);
	}

	transform(options)
	{
		options = Object.assign({}, this.defaults, options);
		const result = new Uint8Array(options.length);
		window.crypto.getRandomValues(result);

		return Array.from(result);
	}
}

class NullBytesGenerator extends Transform
{
	constructor()
	{
		super();
		this.addOutput("bytes", "Bytes")
			.addOption("length", "Length", 16);
	}

	transform(options)
	{
		options = Object.assign({}, this.defaults, options);
		const result = [];
		for (let i = 0; i < options.length; i++)
		{
			result.push(0);
		}

		return result;
	}
}

export {
	KeyboardInputGenerator,
	RandomBytesGenerator,
	NullBytesGenerator
};