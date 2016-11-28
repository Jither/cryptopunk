import { Transform, TransformError } from "../transforms";

class RailFenceTransform extends Transform
{
	constructor(decrypt)
	{
		super();
		this.addInput("string", decrypt ? "Ciphertext" : "Plaintext")
			.addOutput("string", decrypt ? "Plaintext" : "Ciphertext")
			.addOption("rails", "Rails", 5, { min: 2 })
			.addOption("offset", "Offset", 0, { min: 0 });
	}

	transform(str)
	{
		const rails = this.options.rails;
		const offset = this.options.offset;

		if (rails < 2)
		{
			throw new TransformError("Rails must be > 1");
		}

		const interval = (rails - 1) * 2;

		if (offset < 0 || offset >= interval)
		{
			throw new TransformError(`Offset must be between 0 and ${interval - 1}.`);
		}

		const lineIndices = this.getLineIndices(rails, offset, interval);
		
		return this._transform(str, rails, lineIndices);
	}

	getLineIndices(rails, offset, interval)
	{
		const lineIndices = new Array(interval);

		for (let i = 0; i < lineIndices.length; i++)
		{
			const lineIndex = (offset + i) % lineIndices.length;
			lineIndices[i] = lineIndex < rails ? lineIndex : interval - lineIndex;
		}
		return lineIndices;
	}
}

class RailFenceEncryptTransform extends RailFenceTransform
{
	constructor()
	{
		super(false);
	}

	_transform(str, rails, lineIndices)
	{
		const lines = new Array(rails);
		for (let i = 0; i < lines.length; i++)
		{
			lines[i] = [];
		}

		const interval = lineIndices.length;

		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			const lineIndex = lineIndices[i % interval];
			const line = lines[lineIndex];
			line.push(c);
		}

		return lines.map(line => line.join("")).join("");
	}
}

class RailFenceDecryptTransform extends RailFenceTransform
{
	constructor()
	{
		super(true);
	}

	_transform(str, rails, lineIndices)
	{
		const interval = lineIndices.length;
		const lineCharCounts = new Array(rails);
		lineCharCounts.fill(0);

		// Find number of characters that belong to each line
		for (let i = 0; i < str.length; i++)
		{
			const lineIndex = lineIndices[i % interval];
			lineCharCounts[lineIndex]++;
		}

		// Split into lines
		let start = 0;
		const lines = new Array(rails);
		for (let i = 0; i < lines.length; i++)
		{
			const length = lineCharCounts[i];
			lines[i] = str.substr(start, length);
			start += length;
		}

		// Zig-zag our way through the lines
		const charIndices = new Array(rails);
		charIndices.fill(0);
		let result = "";
		for (let i = 0; i < str.length; i++)
		{
			const lineIndex = lineIndices[i % interval];
			const line = lines[lineIndex];
			const c = line.charAt(charIndices[lineIndex]++);
			result += c;
		}

		return result;
	}
}

export {
	RailFenceEncryptTransform,
	RailFenceDecryptTransform
};