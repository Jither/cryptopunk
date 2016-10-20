import { Transform, TransformError } from "../transforms";
import { removeWhiteSpace } from "../../cryptopunk.utils";

class ColumnarTranspositionEncryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Plaintext")
			.addOutput("string", "Ciphertext")
			.addOption("key", "Key", "3,1,4,2,0");
	}

	transform(str, options)
	{
		options = Object.assign({}, this.defaults, options);

		const columnOrder = removeWhiteSpace(options.key).split(",").map(key => parseInt(key.trim(), 10));

		const columns = [];

		// Init columns
		for (let i = 0; i < columnOrder.length; i++)
		{
			columns.push([]);
		}

		let columnIndex = 0;
		for (let i = 0; i < str.length; i++)
		{
			const index = columnOrder[columnIndex];
			const column = columns[index];
			const c = str.charAt(i);
			column.push(c);

			columnIndex++;
			if (columnIndex >= columnOrder.length)
			{
				columnIndex = 0;
			}
		}

		let result = "";

		for (let i = 0; i < columnOrder.length; i++)
		{
			const column = columns[i];

			result += column.join("");
		}

		return result;
	}
}

export {
	ColumnarTranspositionEncryptTransform
};