// Applies columnar transposition to string or array (of strings).
// If string, a character goes into each column.
// If array, an array item goes into each column
// Column order is a "standard" permutation array.
// That is, index 0 indicates where the first column should move to.
function columnarTransposition(strOrArray, columnOrder)
{
	columnOrder = normalizePermutation(columnOrder);

	const columnCount = columnOrder.length;
	const columns = new Array(columnCount);

	for (let i = 0; i < columnCount; i++)
	{
		columns[i] = [];
	}

	let columnIndex = 0;
	for (let i = 0; i < strOrArray.length; i++)
	{
		const index = columnOrder[columnIndex];
		const column = columns[index];
		const c = strOrArray[i];
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

// Applies inverse columnar transposition to string or array.
// If string, a character goes into each column.
// If array, an array item goes into each column.
// Column order is a "standard permutation array"
// as originally applied (e.g. during encryption). That is, index 0 indicates where the first 
// column was moved to.
// In other words, given the same parameters, this function will reverse the actions of
// columnarTransposition().
function inverseColumnarTransposition(strOrArray, columnOrder)
{
	columnOrder = normalizePermutation(columnOrder);
	columnOrder = invertPermutation(columnOrder);

	const columnCount = columnOrder.length;
	let longColumns = strOrArray.length % columnCount;
	if (longColumns === 0)
	{
		longColumns = columnCount;
	}

	const rowCount = Math.ceil(strOrArray.length / columnCount);
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
			rows[rowIndex][index] = rowIndex >= lettersInColumn ? "" : strOrArray[letterIndex++];
		}
	}

	let result = "";
	for (let i = 0; i < rowCount; i++)
	{
		result += rows[i].join("");
	}

	return result;
}

// Normalizes a list of integers to a 0-based permutation array with no gaps
// E.g. 1,7,3,2,5 => 0,4,2,1,3
function normalizePermutation(order)
{
	const sorter = new Array(order.length);
	for (let i = 0; i < sorter.length; i++)
	{
		sorter[i] = i;
	}
	const perm = sorter.sort((a, b) => order[a] - order[b]);
	return invertPermutation(perm);
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
		order[i] = alphabet.indexOf(word.charAt(i));
	}
	return normalizePermutation(order);
}

// Returns an array of coordinates [y,x] / [row, column] of message placed into Polybius square using alphabet.
// If a string of index characters are supplied (e.g. "ABCDE"), an array of strings (e.g. "BC") will be returned instead.
function polybius(message, alphabet, indices)
{
	const width = indices ? indices.length : Math.ceil(Math.sqrt(alphabet.length));

	const result = new Array(message.length);
	for (let i = 0; i < message.length; i++)
	{
		const c = message.charAt(i);
		const index = alphabet.indexOf(c);
		if (index < 0)
		{
			// Not in alphabet:
			result[i] = null;
			continue;
		}
		const row = Math.floor(index / width);
		const column = index % width;
		if (indices)
		{
			result[i] = indices.charAt(row) + indices.charAt(column);
		}
		else
		{
			result[i] = [row, column];
		}
	}
	return result;
}

// Returns an array of coordinates [z,y,x] / [slice, row, column] of message placed into Polybius cube using alphabet.
// If a string of indices are supplied (e.g. "ABCDE"), an array of strings (e.g. "BCE") will be returned instead.
function polybius3(message, alphabet, indices)
{
	const width = indices ? indices.length : Math.ceil(Math.cbrt(alphabet.length));
	const sliceSize = width * width;

	const result = new Array(message.length);
	for (let i = 0; i < message.length; i++)
	{
		const c = message.charAt(i);
		const index = alphabet.indexOf(c);
		if (index < 0)
		{
			// Not in alphabet:
			result[i] = null;
			continue;
		}
		const slice = Math.floor(index / sliceSize);
		const row = Math.floor((index - sliceSize * slice) / width);
		const column = index % width;
		if (indices)
		{
			result[i] = indices.charAt(slice) + indices.charAt(row) + indices.charAt(column);
		}
		else
		{
			result[i] = [slice, row, column];
		}
	}
	return result;
}

// Returns string based on array of coordinates [y,x] / [row, column] into Polybius square using alphabet.
// Alternatively based on string of coordinates where a character, c, maps to row/column at indices.indexOf(c))
function depolybius(message, alphabet, indices)
{
	const width = indices ? indices.length : Math.ceil(Math.sqrt(alphabet.length));

	let result = "";

	if (Array.isArray(message))
	{
		for (let i = 0; i < message.length; i++)
		{
			const coord = message[i];
			const row = coord[0];
			const column = coord[1];
			const index = row * width + column;

			result += alphabet.charAt(index);
		}
	}
	else
	{
		for (let i = 0; i < message.length; i += 2)
		{
			const rowChar = message.charAt(i);
			const colChar = message.charAt(i + 1);
			const row = indices.indexOf(rowChar);
			const column = indices.indexOf(colChar);
			const index = row * width + column;

			result += alphabet.charAt(index);
		}
	}
	return result;
}

// Returns string based on array of coordinates [z,y,x] / [slice, row, column] into Polybius cube using alphabet.
// Alternatively based on string of coordinates where a character, c, maps to slice/row/column at indices.indexOf(c))
function depolybius3(message, alphabet, indices)
{
	const width = indices ? indices.length : Math.ceil(Math.cbrt(alphabet.length));
	const sliceSize = width * width;

	let result = "";

	if (Array.isArray(message))
	{
		for (let i = 0; i < message.length; i++)
		{
			const coord = message[i];
			const slice = coord[0];
			const row = coord[1];
			const column = coord[2];
			const index = slice * sliceSize + row * width + column;

			result += alphabet.charAt(index);
		}
	}
	else
	{
		for (let i = 0; i < message.length; i += 3)
		{
			const sliceChar = message.charAt(i);
			const rowChar = message.charAt(i + 1);
			const colChar = message.charAt(i + 2);
			const slice = indices.indexOf(sliceChar);
			const row = indices.indexOf(rowChar);
			const column = indices.indexOf(colChar);
			const index = slice * sliceSize + row * width + column;

			result += alphabet.charAt(index);
		}
	}
	return result;
}

// Returns true if string has characters that appear in both upper and lower case, otherwise false
// This may be used to e.g. check if case matters for the output of a substitution cipher, based on its alphabet
function hasDualCaseCharacters(str)
{
	const strLower = str.toLowerCase();
	for (let i = 0; i < strLower.length; i++)
	{
		const c1 = strLower.charAt(i);
		for (let j = i + 1; j < str.length; j++)
		{
			const c2 = strLower.charAt(j);
			// Same character in lower case string, but not in original case string? That's dual case:
			if (c1 === c2 && str.charAt(i) !== str.charAt(j))
			{
				return true;
			}
		}
	}
	return false;
}

// Restores case and non-alphabet characters from source text to text
function restoreFormatting(text, source, sourceAlphabet, ignoreCase, textCaseMatters)
{
	let textIndex = 0;
	const originalSource = source;
	if (ignoreCase)
	{
		sourceAlphabet = sourceAlphabet.toUpperCase();
		source = source.toUpperCase();
	}
	let result = "";
	for (let sourceIndex = 0; sourceIndex < source.length; sourceIndex++)
	{
		const sourceC = source.charAt(sourceIndex);
		if (sourceAlphabet.indexOf(sourceC) >= 0)
		{
			// Source character was in alphabet, so get character from text
			// and case from source:
			let textC = text.charAt(textIndex++);

			if (!textCaseMatters)
			{
				const originalSourceC = originalSource.charAt(sourceIndex);
				// Non-letter characters would report as isUpperCase, so we also check isLowerCase
				const isUpperCase = sourceC === originalSourceC;
				const isLowerCase = sourceC.toLowerCase() === originalSourceC;
				// If it's "both upper and lower case" or neither (e.g. numeric digits), we don't do anything
				const isCased = isLowerCase !== isUpperCase;
				if (isCased)
				{
					textC = isLowerCase ? textC.toLowerCase() : textC.toUpperCase();
				}
			}
			result += textC;
		}
		else
		{
			// Not in alphabet, so add character as is:
			result += sourceC;
		}
	}
	if (textIndex !== text.length)
	{
		throw new Error(`Text ${text} does not match source '${source}'.`);
	}
	return result;
}

function removeNonAlphabetCharacters(str, alphabet)
{
	let result = "";
	for (let i = 0; i < str.length; i++)
	{
		const c = str.charAt(i);
		if (alphabet.indexOf(c) < 0)
		{
			continue;
		}
		result += c;
	}
	return result;
}



export {
	columnarTransposition,
	depolybius,
	depolybius3,
	getLetterSortPermutation,
	hasDualCaseCharacters,
	inverseColumnarTransposition,
	invertPermutation,
	normalizePermutation,
	polybius,
	polybius3,
	restoreFormatting,
	removeNonAlphabetCharacters
};