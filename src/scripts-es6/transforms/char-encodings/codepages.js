import { Transform, TransformError } from "../transforms";
import { RX_CONTROL_CODES } from "../../cryptopunk.strings";

function createAscii()
{
	const result = [];
	for (let i = 0x00; i < 0x80; i++)
	{
		result.push(String.fromCharCode(i));
	}

	return result;
}

function createIsoControlChars()
{
	const result = [];
	for (let i = 0x80; i < 0xa0; i++)
	{
		result.push(String.fromCharCode(i));
	}
	return result;
}

const ASCII_CHARS = createAscii();
const ISO_CONTROL_CHARS = createIsoControlChars();

function charsToLookup(chars)
{
	const arr = chars.split("");
	arr.forEach((item, i) => { if (item === " ") { arr[i] = null; } });
	return arr;
}

function createWinMacCodePage(charsFrom0x80)
{
	const arrFrom0x80 = charsToLookup(charsFrom0x80);
	return ASCII_CHARS.concat(arrFrom0x80);
}

function createIsoCodePage(charsFrom0xa0)
{
	const arrFrom0xa0 = charsToLookup(charsFrom0xa0);
	return ASCII_CHARS.concat(ISO_CONTROL_CHARS, arrFrom0xa0);
}

const CODE_PAGE_NAMES = [
	"ISO-8859-1",
	"ISO-8859-2",
	"ISO-8859-3",
	"ISO-8859-4",
	"ISO-8859-5",
	"Windows-1252",
	"Mac OS Roman"
];

// camelcase is not very readable for these identifiers:
/* eslint-disable camelcase */
const CODE_PAGE_VALUES = [
	"iso-8859-1",
	"iso-8859-2",
	"iso-8859-3",
	"iso-8859-4",
	"iso-8859-5",
	"windows-1252",
	"macos-roman"
];

// Space (0x20) indicates non-printable/reserved!!
const CODE_PAGES = {
	"iso-8859-1": createIsoCodePage("\xa0¡¢£¤¥¦§¨©ª«¬\xad®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ"),
	"iso-8859-2": createIsoCodePage("\xa0Ą˘Ł¤ĽŚ§¨ŠŞŤŹ\xadŽŻ°ą˛ł´ľśˇ¸šşťź˝žżŔÁÂĂÄĹĆÇČÉĘËĚÍÎĎĐŃŇÓÔŐÖ×ŘŮÚŰÜÝŢßŕáâăäĺćçčéęëěíîďđńňóôőö÷řůúűüýţ˙"),
	"iso-8859-3": createIsoCodePage("\xa0Ħ˘£¤ Ĥ§¨İŞĞĴ\xad Ż°ħ²³´µĥ·¸ışğĵ½ żÀÁÂ ÄĊĈÇÈÉÊËÌÍÎÏ ÑÒÓÔĠÖ×ĜÙÚÛÜŬŜßàáâ äċĉçèéêëìíîï ñòóôġö÷ĝùúûüŭŝ˙"),
	"iso-8859-4": createIsoCodePage("\xa0ĄĸŖ¤ĨĻ§¨ŠĒĢŦ\xadŽ¯°ą˛ŗ´ĩļˇ¸šēģŧŊžŋĀÁÂÃÄÅÆĮČÉĘËĖÍÎĪĐŅŌĶÔÕÖ×ØŲÚÛÜŨŪßāáâãäåæįčéęëėíîīđņōķôõö÷øųúûüũū˙"),
	"iso-8859-5": createIsoCodePage("\xa0ЁЂЃЄЅІЇЈЉЊЋЌ\xadЎЏАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдежзийклмнопрстуфхцчшщъыьэюя№ёђѓєѕіїјљњћќ§ўџ"),
	// TODO: ISO-8859-6 - Arabic not that easy to do as literal characters
	"windows-1252": createWinMacCodePage("€ ‚ƒ„…†‡ˆ‰Š‹Œ Ž  ‘’“”•–—\u02dc™š›œ žŸ\xa0¡¢£¤¥¦§¨©ª«¬\xad®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ"),
	"macos-roman":  createWinMacCodePage("ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»…\xa0ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ") //  = Apple logo - private area
};
/* eslint-enable camelcase */

class CodePageToBytesTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("string", "String")
			.addOutput("bytes", "Bytes")
			.addOption("codepage", "Code page", "iso-8859-1", { type: "select", texts: CODE_PAGE_NAMES, values: CODE_PAGE_VALUES });
	}

	transform(str)
	{
		const codepage = CODE_PAGES[this.options.codepage];

		const result = new Uint8Array(str.length);
		for (let i = 0; i < str.length; i++)
		{
			const chr = str.charAt(i);
			const code = codepage.indexOf(chr);
			if (code < 0)
			{
				throw new TransformError(`Character '${chr}' doesn't exist in ${this.options.codepage}`);
			}
			result[i] = code;
		}
		return result;
	}
}

class BytesToCodePageTransform extends Transform
{
	constructor()
	{
		super();
		this.addInput("bytes", "Bytes")
			.addOutput("string", "String")
			.addOption("codepage", "Code page", "iso-8859-1", { type: "select", texts: CODE_PAGE_NAMES, values: CODE_PAGE_VALUES })
			.addOption("stripCC", "Strip control codes", true);
	}

	transform(bytes)
	{
		const codepage = CODE_PAGES[this.options.codepage];

		let result = "";
		for (let i = 0; i < bytes.length; i++)
		{
			let c = codepage[bytes[i]];

			if (c === null)
			{
				c = "\ufffd";
			}
			result += c;
		}

		if (this.options.stripCC)
		{
			result = result.replace(RX_CONTROL_CODES, "");
		}
		return result;
	}
}

export {
	BytesToCodePageTransform,
	CodePageToBytesTransform
};