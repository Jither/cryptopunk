import { Transform, TransformError } from "../transforms";

const SCHEME_VALUES = [
	"zero", // ISO/IEC 9797-1, method 1
	"bit", // ISO/IEC 9797-1, method 2
	"ansi", // ANSI X.923
	"iso10126", // ISO 10126
	"pkcs7" // PKCS#7 (identical to PKCS#5)
];

const SCHEME_NAMES = [
	"Zero (ISO method 1)",
	"Bit (ISO method 2)",
	"ANSI X.923",
	"ISO 10126",
	"PKCS#7"
];

class PaddingAddTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Output")
			.addOption("length", "Block Length", 16, { min: 1 })
			.addOption("scheme", "Scheme", "zero", { type: "select", values: SCHEME_VALUES, texts: SCHEME_NAMES });
	}

	transform(bytes)
	{
		const blockLength = this.options.length;
		const scheme = this.options.scheme;
		
		let requiredPadding = blockLength - (bytes.length % blockLength);
		
		// All padding schemes, except zero padding, require an additional block, if there's no room for the padding.
		// They already got that above.
		if (scheme === "zero")
		{
			if (requiredPadding === blockLength)
			{
				requiredPadding = 0;
			}
		}

		const requiredLength = bytes.length + requiredPadding;
		const output = new Uint8Array(requiredLength);
		output.set(bytes);
		
		const lastByte = output.length - 1;

		let padding;

		switch (scheme)
		{
			case "zero":
				break;
			case "bit":
				// Pad with zeroes, add single bit after message
				output[bytes.length] = 0x80;
				break;
			case "ansi":
				// Pad with zeroes, last byte contains length of padding
				// Note: Maximum block length = 255
				output[lastByte] = requiredPadding;
				break;
			case "iso10126":
				// Like ANSI, but fill padding with random bytes
				padding = output.subarray(bytes.length, lastByte);
				crypto.getRandomValues(padding);
				output[lastByte] = requiredPadding;
				break;
			case "pkcs7":
				// Pad with bytes indicating length of padding:
				padding = output.subarray(bytes.length, output.length);
				for (let i = 0; i < padding.length; i++)
				{
					padding[i] = requiredPadding;
				}
				break;
			default:
				throw new TransformError(`Unknown padding scheme: ${scheme}.`);
		}

		return output;
	}
}

class PaddingRemoveTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Input")
			.addOutput("bytes", "Output")
			.addOption("scheme", "Scheme", "zero", { type: "select", values: SCHEME_VALUES, texts: SCHEME_NAMES });
	}

	transform(bytes)
	{
		const scheme = this.options.scheme;
		
		const end = bytes.length;
		let start = end;

		if (end === 0)
		{
			return new Uint8Array();
		}

		switch (scheme)
		{
			case "zero":
				while (start > 0 && bytes[start - 1] === 0)
				{
					start--;
				}
				break;
			case "bit":
				let b;
				while (start > 0)
				{
					b = bytes[--start];
					if (b !== 0x00)
					{
						break;
					}
				}
				if (b !== 0x80)
				{
					throw new TransformError(`Invalid bit padding: Expected 0x80 to follow message, but found 0x${b.toString(16)}`);
				}
				break;
			case "ansi":
			case "iso10126":
			case "pkcs7":
				const length = bytes[end - 1];
				start = end - length;
				if (start < 0)
				{
					throw new TransformError("Invalid padding: Indicated padding length larger than message.");
				}
				switch (scheme)
				{
					case "ansi":
						for (let i = start; i < end - 1; i++)
						{
							if (bytes[i] !== 0)
							{
								throw new TransformError("Invalid ANSI padding: non-zero bytes in padding.");
							}
						}
						break;
					case "pkcs7":
						for (let i = start; i < end; i++)
						{
							if (bytes[i] !== length)
							{
								throw new TransformError("Invalid PKCS#7 padding: non-length bytes in padding.");
							}
						}
						break;
				}
				break;
			default:
				throw new TransformError(`Unknown padding scheme: ${scheme}.`);
		}

		return Uint8Array.from(bytes.subarray(0, start));
	}
}

export {
	PaddingAddTransform,
	PaddingRemoveTransform
};