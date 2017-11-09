import { Transform } from "../transforms";
import { columnarTransposition, normalizePermutation, invertPermutation } from "./cryptopunk.classical-utils";
import { removeWhiteSpace } from "../../cryptopunk.strings";

class AmscoEncryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Plaintext")
			.addOutput("string", "Ciphertext")
			.addOption("key", "Key", "3,1,4,2,0", { type: "short-string" })
			.addOption("cuts", "Cuts", "1,2", { type: "short-string" });
	}

	transform(str)
	{
		const columnOrder = removeWhiteSpace(this.options.key).split(",").map(key => parseInt(key.trim(), 10));
		const columnCount = columnOrder.length;
		const cuts = removeWhiteSpace(this.options.cuts).split(",").map(key => parseInt(key.trim(), 10));
		
		// Split plaintext by cuts
		// Each row horizontally follows cut sequence
		// First column vertically follows cut sequence
		let columnIndex = 0;
		let rowIndex = 0;
		let cutsIndex = 0;
		const cells = [];
		let i = 0;
		while (i < str.length)
		{
			const cut = cuts[cutsIndex % cuts.length];
			cells.push(str.substr(i, cut));
			i += cut;
			cutsIndex++;
			columnIndex++;
			if (columnIndex % columnCount === 0)
			{
				rowIndex++;
				columnIndex = 0;
				cutsIndex = rowIndex;
			}
		}

		return columnarTransposition(cells, columnOrder);
	}
}

class AmscoDecryptTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "Plaintext")
			.addOutput("string", "Ciphertext")
			.addOption("key", "Key", "3,1,4,2,0", { type: "short-string" })
			.addOption("cuts", "Cuts", "1,2", { type: "short-string" });
	}

	generateLengthsTable(str, cuts, columnCount)
	{
		const lengths = new Array(columnCount);
		for (let i = 0; i < lengths.length; i++)
		{
			lengths[i] = [];
		}

		let count = str.length;
		let cutsIndex = 0;
		let columnIndex = 0;
		let rowIndex = 0;
		while (count > 0)
		{
			const cut = Math.min(cuts[cutsIndex % cuts.length], count);
			lengths[columnIndex].push(cut);
			count -= cut;
			
			cutsIndex++;
			
			columnIndex++;
			if (columnIndex >= columnCount)
			{
				rowIndex++;
				columnIndex = 0;
				cutsIndex = rowIndex;
			}
		}

		return lengths;
	}

	transform(str)
	{
		// We can't reuse inverseColumnarTransposition, since the length of each cell depends on the un-transposed column order
		let columnOrder = removeWhiteSpace(this.options.key).split(",").map(key => parseInt(key.trim(), 10));
		const columnCount = columnOrder.length;
		const cuts = removeWhiteSpace(this.options.cuts).split(",").map(key => parseInt(key.trim(), 10));
		
		columnOrder = normalizePermutation(columnOrder);
		columnOrder = invertPermutation(columnOrder);

		// Create a matrix of the lengths of each cell
		const lengths = this.generateLengthsTable(str, cuts, columnCount);

		const rowCount = lengths[0].length;
		const rows = new Array(rowCount);
		for (let i = 0; i < rowCount; i++)
		{
			rows[i] = [];
		}

		// Go through matrix in (original) column order, cutting the ciphertext
		// into parts of the length indicated by each cell
		let strIndex = 0;
		for (let columnIndex = 0; columnIndex < columnCount; columnIndex++)
		{
			// Get original (un-transposed) column:
			const index = columnOrder[columnIndex];
			const lens = lengths[index];
			for (let rowIndex = 0; rowIndex < lens.length; rowIndex++)
			{
				const len = lens[rowIndex];
				const cell = str.substr(strIndex, len);
				rows[rowIndex][index] = cell;
				strIndex += len;
			}
		}

		let result = "";
		for (let i = 0; i < rowCount; i++)
		{
			result += rows[i].join("");
		}
	
		return result;
	}
}

export {
	AmscoEncryptTransform,
	AmscoDecryptTransform
};