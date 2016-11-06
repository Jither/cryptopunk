function hasDuplicateCharacters(str)
{
	for (let i = 0; i < str.length; i++)
	{
		const c = str.charAt(i);
		for (let j = i + 1; j < str.length; j++)
		{
			if (str.charAt(j) === c)
			{
				return true;
			}
		}
	}
	return false;
}

function multiByteStringReverse(str)
{
	// Swap symbols with their combining marks so the combining marks go first
	str = str.replace(rxSymbolWithCombiningMarks, (all, first, second) => multiByteStringReverse(second) + first);
	// Swap surrogate pairs
	str = str.replace(rxSurrogatePair, "$2$1");

	let result = "";
	let index = str.length;
	while (index--)
	{
		result += str.charAt(index);
	}
	return result;
}

function removeWhiteSpace(str)
{
	return str.replace(/\s+/g, "");
}

export {
	hasDuplicateCharacters,
	multiByteStringReverse,
	removeWhiteSpace
};