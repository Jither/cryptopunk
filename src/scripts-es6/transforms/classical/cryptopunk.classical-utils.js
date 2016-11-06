// Applies columnar transposition to string. Column order is a "standard" permutation array.
// That is, index 0 indicates where the first column should move to.
function columnarTransposition(str, columnOrder)
{
	const columnCount = columnOrder.length;
	const columns = new Array(columnCount);

	for (let i = 0; i < columnCount; i++)
	{
		columns[i] = [];
	}

	let columnIndex = 0;
	for (let i = 0; i < str.length; i++)
	{
		const index = columnOrder[columnIndex];
		const column = columns[index];
		const c = str.charAt(i);
		column.push(c);

		columnIndex++;
		if (columnIndex >= columnCount)
		{
			columnIndex = 0;
		}
	}

	let result = "";
	for (let i = 0; i < columnCount; i++)
	{
		const column = columns[i];
		result += column.join("");
	}

	return result;
}

// Applies inverse columnar transposition to string. Column order is a "standard permutation array"
// as originally applied (e.g. during encryption). That is, index 0 indicates where the first 
// column was moved to.
// In other words, given the same parameters, this function will reverse the actions of
// columnarTransposition().
function inverseColumnarTransposition(str, columnOrder)
{
	columnOrder = invertPermutation(columnOrder);

	const columnCount = columnOrder.length;
	let longColumns = str.length % columnCount;
	if (longColumns === 0)
	{
		longColumns = columnCount;
	}

	const rowCount = Math.ceil(str.length / columnCount);
	const rows = new Array(rowCount);
	for (let i = 0; i < rowCount; i++)
	{
		rows[i] = [];
	}

	let letterIndex = 0;
	for (let columnIndex = 0; columnIndex < columnCount; columnIndex++)
	{
		const index = columnOrder[columnIndex];
		const lettersInColumn = index < longColumns ? rowCount : rowCount - 1;
		for (let rowIndex = 0; rowIndex < rowCount; rowIndex++)
		{
			rows[rowIndex][index] = rowIndex >= lettersInColumn ? "" : str.charAt(letterIndex++);
		}
	}

	let result = "";
	for (let i = 0; i < rowCount; i++)
	{
		result += rows[i].join("");
	}

	return result;
}

// Inverts a permutation array. That is, swaps index and value so that the resulting array will define the
// inverse of the original permutation.
function invertPermutation(perm)
{
	const result = new Array(perm.length);
	for (let i = 0; i < perm.length; i++)
	{
		result[i] = perm.indexOf(i);
	}
	return result;
}

// Returns the permutation of a word if sorted alphabetically (optionally by custom alphabet)
// That is, the number at index 0 of the returned array will indicate what index the first letter
// of the word will move to when letters are sorted.
function getLetterSortPermutation(word, alphabet)
{
	alphabet = alphabet || "abcdefghijklmnopqrstuvwxyz";
	word = word.toLowerCase();
	const order = new Array(word.length);
	for (let i = 0; i < word.length; i++)
	{
		order[i] = i;
	}
	const perm = order.sort((a,b) => alphabet.indexOf(word.charAt(a)) - alphabet.indexOf(word.charAt(b)));
	return invertPermutation(perm);
}

export {
	columnarTransposition,
	getLetterSortPermutation,
	inverseColumnarTransposition
};