import { Transform } from "../transforms";

const WORD_SIZE_NAMES = [
	"16 bits (word)",
	"24 bits (tribyte)",
	"32 bits (dword)",
	"64 bits (qword)",
	"128 bits (dqword)"
];

const WORD_SIZE_VALUES = [
	2,
	3,
	4,
	8,
	16
];

class EndiannessTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Output")
			.addOption("wordSize", "WordSize", 4, { type: "select", values: WORD_SIZE_VALUES, texts: WORD_SIZE_NAMES });
	}

	transform(bytes)
	{
		const result = new Uint8Array(bytes.length);
		const wordSize = this.options.wordSize;

		for (let i = 0; i < bytes.length; i += wordSize)
		{
			const length = Math.min(wordSize, bytes.length - i);
			const last = i + length - 1;
			for (let j = 0; j < length; j++)
			{
				result[i + j] = bytes[last - j];
			}
		}

		return result;
	}
}

export {
	EndiannessTransform
};