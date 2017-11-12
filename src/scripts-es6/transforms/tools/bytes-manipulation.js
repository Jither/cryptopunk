import { Transform } from "../transforms";

class SimpleBytesTranspositionTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Output")
			.addOption("reverse", "Reverse", false);
	}

	transform(bytes)
	{
		const result = Uint8Array.from(bytes);
		if (this.options.reverse)
		{
			result.reverse();
		}

		return result;
	}
}

export {
	SimpleBytesTranspositionTransform
};