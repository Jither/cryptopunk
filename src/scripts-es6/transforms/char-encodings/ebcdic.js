import { BaseCodePageToBytesTransform, BaseBytesToCodePageTransform } from "./codepages";

function charsToLookup(chars)
{
	const arr = chars.split("");
	arr.forEach((item, i) => { if (item === " ") { arr[i] = null; } });
	return arr;
}

function createCodePage(charsFrom0x42)
{
	return [
			0x00, 0x01, 0x02, 0x03, 0x9c, 0x09, 0x86, 0x7f, 0x97, 0x8d, 0x8e, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
			0x10, 0x11, 0x12, 0x13, 0x9d, 0x85, 0x08, 0x87, 0x18, 0x19, 0x92, 0x8f, 0x1c, 0x1d, 0x1e, 0x1f,
			0x80, 0x81, 0x82, 0x83, 0x84, 0x0a, 0x17, 0x1b, 0x88, 0x89, 0x8a, 0x8b, 0x8c, 0x05, 0x06, 0x07,
			0x90, 0x91, 0x16, 0x93, 0x94, 0x95, 0x96, 0x04, 0x98, 0x99, 0x9a, 0x9b, 0x14, 0x15, 0x9e, 0x1a,
			0x20, 0xa0
	].concat(charsToLookup(charsFrom0x42));
}

// TODO: More code pages
const CODE_PAGE_NAMES = [
	"CCSID 37/1140",
	"CCSID 285/1146"
];

const CODE_PAGE_VALUES = [
	"37",
	"285"
];

const CODE_PAGES = {
	"37" : createCodePage("âäàáãåçñ¢.<(+|&éêëèíîïìß!$*);¬-/ÂÄÀÁÃÅÇÑ¦,%_>?øÉÊËÈÍÎÏÌ`:#@'=\"Øabcdefghi«»ðýþ±°jklmnopqrªºæ¸Æ¤µ~stuvwxyz¡¿ÐÝÞ®^£¥·©§¶¼½¾[]¯¨´×{ABCDEFGHI\xadôöòóõ}JKLMNOPQR¹ûüùúÿ\\÷STUVWXYZ²ÔÖÒÓÕ0123456789³ÛÜÙÚ\x9f"),
	"285": createCodePage("âäàáãåçñ$.<(+|&éêëèíîïìß!£*);¬-/ÂÄÀÁÃÅÇÑ¦,%_>?øÉÊËÈÍÎÏÌ`:#@'=\"Øabcdefghi«»ðýþ±°jklmnopqrªºæ¸Æ¤µ¯stuvwxyz¡¿ÐÝÞ®¢[¥·©§¶¼½¾^]~¨´×{ABCDEFGHI\xadôöòóõ}JKLMNOPQR¹ûüùúÿ\\÷STUVWXYZ²ÔÖÒÓÕ0123456789³ÛÜÙÚ\x9f"),
}

class EbcdicToBytesTransform extends BaseCodePageToBytesTransform
{
	constructor()
	{
		super(CODE_PAGES, "37", CODE_PAGE_NAMES, CODE_PAGE_VALUES);
	}
}

class BytesToEbcdicTransform extends BaseBytesToCodePageTransform
{
	constructor()
	{
		super(CODE_PAGES, "37", CODE_PAGE_NAMES, CODE_PAGE_VALUES);
	}
}

export {
	EbcdicToBytesTransform,
	BytesToEbcdicTransform
};