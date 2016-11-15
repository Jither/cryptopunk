import { Transform, TransformError } from "../transforms";

const VARIANT_NAMES = [
	"ITU",
	"American (Morse)",
	"Contintental (Gerke)"
];

const VARIANT_VALUES = [
	"itu",
	"american",
	"continental"
];

const ITU = {
	"A": ".-",
	"B": "-...",
	"C": "-.-.",
	"D": "-..",
	"E": ".",
	"F": "..-.",
	"G": "--.",
	"H": "....",
	"I": "..",
	"J": ".---",
	"K": "-.-",
	"L": ".-..",
	"M": "--",
	"N": "-.",
	"O": "---",
	"P": ".--.",
	"Q": "--.-",
	"R": ".-.",
	"S": "...",
	"T": "-",
	"U": "..-",
	"V": "...-",
	"W": ".--",
	"X": "-..-",
	"Y": "-.--",
	"Z": "--..",

	"1": ".----",
	"2": "..---",
	"3": "...--",
	"4": "....-",
	"5": ".....",
	"6": "-....",
	"7": "--...",
	"8": "---..",
	"9": "----.",
	"0": "-----",

	".": ".-.-.-",
	",": "--..--",
	"?": "..--..",
	"'": ".----.",
	"!": "-.-.--",
	"/": "-..-.",
	"(": "-.--.",
	")": "-.--.-",
	"&": ".-...", // Not in ITU-R recommendation
	":": "---...",
	"=": "-...-",
	"+": ".-.-.",
	"-": "-....-",
	"_": "..--.-", // Not in ITU-R recommendation
	"\"": ".-..-.",
	"$": "...-..-", // Not in ITU-R recommendation
	"@": ".--.-.",

/*	
	// TODO: Non-english
	"à": ".--.-",
	"å": ".--.-",
	"ä": ".-.-",
	"æ": ".-.-",
	"ą": ".-.-",
	"ć": "-.-..",
	"ĉ": "-.-..",
	"ç": "-.-..",
	"ch": "----",
	"ĥ": "----",
	"š": "----",
	"đ": "..-..",
	"é": "..-..",
	"ę": "..-..",
	"ð": "..--.",
	"è": ".-..-",
	"ł": ".-..-",
	"ĝ": "--.-.",
	"ĵ": ".---.",
	"ń": "--.--",
	"ó": "---.",
	"ö": "---.",
	"ø": "---.",
	"ś": "---.---",
	"ŝ": "...-.",
	"þ": ".--..",
	"ü": "..--",
	"ŭ": "..--",
	"ź": "--..-.",
	"ż": "--..-",
*/

	"<SK>": "...-.-",
	"<HH>": "........",
	//"<K>": "-.-", // = K
	"<CT>": "-.-.-",
	"<AR>": ".-.-.",
	"<SN>": "...-.", // = Ŝ
	"<AS>": ".-...", // = &
	"<AA>": ".-.-",
	"<BT>": "-...-",
	"<NJ>": "-..---",
	"<SK>": "...-.-",
	"<SOS>": "...---..."
};

function reverseDictionary(dict)
{
	const result = {};
	for (const key in dict)
	{
		if (!dict.hasOwnProperty(key))
		{
			continue;
		}
		result[dict[key]] = key;
	}
	return result;
}

const DICTIONARIES = {
	"itu": {
		textToMorse: ITU,
		morseToText: reverseDictionary(ITU)
	}
};

class MorseToTextTransform extends Transform
{
	constructor()
	{
		// TODO: Actually use dot/dash options
		super();
		this.addInput("string", "Morse")
			.addOutput("string", "Text")
			.addOption("variant", "Variant", "itu", { type: "select", texts: VARIANT_NAMES, values: VARIANT_VALUES })
			.addOption("dot", "Dot", ".", { type: "char" })
			.addOption("dash", "Dash", "-", { type: "char" })
			.addOption("gap", "Gap", " ", { type: "char" })
			.addOption("space", "Space", "/", { type: "char" });
	}

	transform(str)
	{
		const dictionaries = DICTIONARIES[this.options.variant];
		if (!dictionaries)
		{
			throw new TransformError(`Variant '${this.options.variant}' not yet implemented.`);
		}
		const dictionary = dictionaries.morseToText;

		const inWords = str.split(this.options.space);
		const outWords = [];
		for (let wordIndex = 0; wordIndex < inWords.length; wordIndex++)
		{
			let word = inWords[wordIndex];
			word = word.trim();
			if (word === "")
			{
				continue;
			}

			const letters = word.split(this.options.gap);

			let outWord = "";
			for (let letterIndex = 0; letterIndex < letters.length; letterIndex++)
			{
				let letter = letters[letterIndex];
				letter = letter.trim();
				if (letter === "")
				{
					continue;
				}
				outWord += dictionary[letter] || "\ufffd";
			}
			outWords.push(outWord);
		}
		let result = outWords.join(" ");

		return result;
	}
}

class TextToMorseTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Text")
			.addOutput("string", "Morse")
			.addOption("variant", "Variant", "itu", { type: "select", texts: VARIANT_NAMES, values: VARIANT_VALUES })
			.addOption("dot", "Dot", ".", { type: "char" })
			.addOption("dash", "Dash", "-", { type: "char" })
			.addOption("gap", "Gap", " ", { type: "char" })
			.addOption("space", "Space", "/", { type: "char" });
	}

	transform(str)
	{
		// TODO: Prosigns

		const dictionaries = DICTIONARIES[this.options.variant];
		if (!dictionaries)
		{
			throw new TransformError(`Variant '${this.options.variant}' not yet implemented.`);
		}
		const dictionary = dictionaries.textToMorse;

		const result = [];
		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i).toUpperCase();
			if (c === " ")
			{
				result.push(this.options.space);
				continue;
			}

			const letter = dictionary[c] || "\ufffd";
			result.push(letter);
		}

		return result.join(this.options.gap);
	}
}

export {
	MorseToTextTransform,
	TextToMorseTransform
};