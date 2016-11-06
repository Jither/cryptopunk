function escapeForRegex(str)
{
	return str.replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&");
}

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

const rxSymbolWithCombiningMarks = /([\0-\u02FF\u0370-\u1AAF\u1B00-\u1DBF\u1E00-\u20CF\u2100-\uD7FF\uE000-\uFE1F\uFE30-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])([\u0300-\u036F\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]+)/g;
const rxSurrogatePair = /([\uD800-\uDBFF])([\uDC00-\uDFFF])/g;

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
	escapeForRegex,
	hasDuplicateCharacters,
	multiByteStringReverse,
	removeWhiteSpace
};