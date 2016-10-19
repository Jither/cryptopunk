import { TransformError } from "./transforms";
import { SubstitutionTransform } from "./substitution";
import { mod, removeWhiteSpace, isPerfectSquare } from "../cryptopunk.utils";

class BifidEncryptTransform extends SubstitutionTransform
{
	constructor()
	{
		super();
		this.addOption("alphabet", "Alphabet table", "ABCDEFGHIKLMNOPQRSTUVWXYZ")
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		const alphabet = removeWhiteSpace(options.alphabet);

		if (!isPerfectSquare(alphabet.length))
		{
			throw new TransformError(`Alphabet table must be a perfect square.`);
		}

		const size = Math.sqrt(alphabet.length);

		const rows = [], cols = [];
		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			this.substitute(
				c,
				alphabet,
				options.ignoreCase,
				index => {
					rows.push(Math.floor(index / size));
					cols.push(mod(index, size));
					return " "; // DUMMY
				}
			);
		}

		const positions = rows.concat(cols);

		let result = "";
		let encryptedPosition = 0;
		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			result += this.substitute(
				c,
				alphabet,
				options.ignoreCase,
				() => {
					const row = positions[encryptedPosition++];
					const col = positions[encryptedPosition++];
					return alphabet.charAt(row * size + col);
				}
			);
		}

		return result;
	}
}

class BifidDecryptTransform extends SubstitutionTransform
{
	constructor()
	{
		super();
		this.addOption("alphabet", "Alphabet table", "ABCDEFGHIKLMNOPQRSTUVWXYZ")
			.addOption("ignoreCase", "Ignore case", true);
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		const alphabet = removeWhiteSpace(options.alphabet);

		if (!isPerfectSquare(alphabet.length))
		{
			throw new TransformError(`Alphabet table must be a perfect square.`);
		}
		const size = Math.sqrt(alphabet.length);

		const positions = [];
		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			this.substitute(
				c,
				alphabet,
				options.ignoreCase,
				index => {
					positions.push(Math.floor(index / size));
					positions.push(mod(index, size));
					return " "; // DUMMY
				}
			);
		}

		let result = "";

		const rows = positions;
		const cols = positions.slice(positions.length / 2);

		let encryptedPosition = 0;
		for (let i = 0; i < str.length; i++)
		{
			const c = str.charAt(i);
			result += this.substitute(
				c,
				alphabet,
				options.ignoreCase,
				() => {
					const row = rows[encryptedPosition];
					const col = cols[encryptedPosition];
					encryptedPosition++;
					return alphabet.charAt(row * size + col);
				}
			);
		}

		return result;
	}
}

export {
	BifidEncryptTransform,
	BifidDecryptTransform
};