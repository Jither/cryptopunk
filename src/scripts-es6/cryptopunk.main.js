import * as affine from "./transforms/classical/affine";
import * as ascii from "./transforms/ascii";
import * as baseN from "./transforms/base-n";
import * as bifid from "./transforms/classical/bifid";
import * as binary from "./transforms/binary";
import * as codepages from "./transforms/codepages";
import * as columns from "./transforms/classical/columns";
import * as crc from "./transforms/checksums/crc";
import * as enigma from "./transforms/mechanical/enigma";
import * as haval from "./transforms/hashes/haval";
import * as keccak from "./transforms/hashes/keccak";
import * as hex from "./transforms/hex";
import * as md2 from "./transforms/hashes/md2";
import * as md4 from "./transforms/hashes/md4";
import * as md5 from "./transforms/hashes/md5";
import * as nativeAes from "./transforms/browser-native/aes";
import * as nativeRsa from "./transforms/browser-native/rsa";
import * as numbers from "./transforms/numbers";
import * as rijndael from "./transforms/modern/rijndael";
import * as ripemd128 from "./transforms/hashes/ripemd128";
import * as ripemd160 from "./transforms/hashes/ripemd160";
import * as rotx from "./transforms/classical/rotx";
import * as sha1 from "./transforms/hashes/sha1";
import * as sha2 from "./transforms/hashes/sha2";
import * as sha3 from "./transforms/hashes/sha3";
import * as skip from "./transforms/classical/skip";
import * as stringManipulation from "./transforms/string-manipulation";
import * as substitution from "./transforms/classical/substitution";
import * as unicode from "./transforms/unicode";
import * as vigenere from "./transforms/classical/vigenere";
import * as xor from "./transforms/modern/xor";
import * as propertyPanel from "./cryptopunk.property-panel";

import * as generators from "./transforms/generators";

import { TransformError } from "./transforms/transforms";

import { NodeEditor } from "./jither.nodeeditor";

const elePalette = document.getElementById("palette-nodes");
let elePaletteCategory;

const editor = new NodeEditor(document.getElementById("nodes"), document.getElementById("editor-svg"));

editor.selectedNodeChanged.add(propertyPanel.showProperties);

class TransformNodeController
{
	constructor(name, transform, options)
	{
		this.node = editor.addNode(name);
		this.transform = transform;
		this.node.controller = this;
		this.options = Object.assign({}, transform.defaults);
		this.inputs = transform.inputs || [];
		this.outputs = transform.outputs || [];

		let index = 0;
		this.inputs.forEach(input => {
			this.node.addInput(transform.inputNames[index])
				.tags({ type: input })
				.acceptsConnection(this.acceptsConnection.bind(this));
			index++;
		});

		index = 0;
		this.outputs.forEach(output => {
			this.node.addOutput(transform.outputNames[index])
				.tags({ type: output })
				.acceptsConnection(this.acceptsConnection.bind(this));
			index++;
		});

		this.node.moveTo(options.x || 0, options.y || 0);

		this.node.inputValueChanged.add(this.inputValueChangedListener.bind(this));

		this.update();
	}

	acceptsConnection(socket1, socket2)
	{
		return socket1.tags.type === socket2.tags.type;
	}

	inputsToArgs()
	{
		const args = [];
		let i = 0;
		this.inputs.forEach(input => {
			let value = this.node.inputs[i].value;
			if (value === null)
			{
				// Insert empty value rather than null
				switch (input)
				{
					case "string":
						value = "";
						break;
					case "bytes":
						value = new Uint8Array();
						// This is to ensure that transforms don't mutate the array
						// (For development/testing purposes)
						// Object.freeze(value);
						break;
				}
			}
			args.push(value);
			i++;
		});
		args.push(this.options);
		return args;
	}

	update()
	{
		const args = this.inputsToArgs();

		if (this.transform.transformAsync)
		{
			this.doTransformAsync(args);
		}
		else
		{
			this.doTransform(args);
		}
	}

	doTransform(args)
	{
		let output;
		let errorMessage = null;
		try
		{
			output = this.transform.transform(...args);
		}
		catch (e)
		{
			if (e instanceof TransformError)
			{
				errorMessage = e.message;
				output = null;
			}
			else
			{
				throw e;
			}
		}
		this.updateOutput(output, errorMessage);
	}

	doTransformAsync(args)
	{
		try
		{
			this.transform.transformAsync(...args)
				.then(output => {
					this.updateOutput(output);
				})
				.catch(e => {
					if (e instanceof TransformError)
					{
						this.updateOutput(null, e.message);
					}
					else
					{
						throw e;
					}
				});
		}
		catch (e)
		{
			if (e instanceof TransformError)
			{
				this.updateOutput(null, e.message);
			}
			else
			{
				throw e;
			}
		}
	}

	updateOutput(output, errorMessage)
	{
		this.node.error = !!errorMessage;
		this.node.value = output;
		if (this.node.outputs.length > 0)
		{
			this.node.outputs[0].value = output;
		}
		if (errorMessage)
		{
			this.node.contentElement.innerText = errorMessage;
		}
		else
		{
			this.node.contentElement.innerText = typeof output === "string" ? output : this.toHex(output);
		}
		propertyPanel.updateOutputs(this.node);
	}

	inputValueChangedListener(/*socket, value*/)
	{
		this.update();
	}

	toHex(bytes)
	{
		let result = "";
		for (let i = 0; i < bytes.length; i++)
		{
			if (i > 0)
			{
				result += " ";
			}

			result += ("0" + bytes[i].toString(16)).substr(-2);
		}
		return result;
	}
}

function addPaletteCategory(caption)
{
	const header = document.createElement("h1");
	header.innerText = caption;
	elePalette.appendChild(header);

	elePaletteCategory = document.createElement("ul");
	elePalette.appendChild(elePaletteCategory);
}

function addPaletteItem(transform, menuCaption, caption)
{
	caption = caption || menuCaption;

	const item = document.createElement("li");
	const btn = document.createElement("a");
	btn.href = "#";
	btn.innerText = menuCaption;
	btn.addEventListener("click", e => {
		e.preventDefault();
		new TransformNodeController(caption, new transform(), { x: 50, y: 300});
	});

	item.appendChild(btn);
	elePaletteCategory.appendChild(item);
}

addPaletteCategory("Generators");
addPaletteItem(generators.KeyboardInputGenerator, "Keyboard Input");
addPaletteItem(generators.NullBytesGenerator, "Null Bytes");
addPaletteItem(generators.RandomBytesGenerator, "Random Bytes");

addPaletteCategory("Text to bytes");
addPaletteItem(ascii.AsciiToBytesTransform, "ASCII", "ASCII > Bytes");
addPaletteItem(codepages.CodePageToBytesTransform, "Code page", "Code page > Bytes");
addPaletteItem(unicode.Ucs2ToBytesTransform, "UCS-2", "UCS-2 > Bytes");
addPaletteItem(unicode.Utf8ToBytesTransform, "UTF-8", "UTF-8 > Bytes");
addPaletteItem(unicode.Utf16ToBytesTransform, "UTF-16", "UTF-16 > Bytes");

addPaletteItem(numbers.BinaryNumbersToBytesTransform, "Binary Numbers", "Binary Numbers > Bytes");
addPaletteItem(numbers.OctalNumbersToBytesTransform, "Octal Numbers", "Octal Numbers > Bytes");
addPaletteItem(numbers.DecimalNumbersToBytesTransform, "Decimal Numbers", "Decimal Numbers > Bytes");
addPaletteItem(numbers.HexNumbersToBytesTransform, "Hex Numbers", "Hex Numbers > Bytes");

addPaletteItem(binary.BinaryToBytesTransform, "Binary", "Binary > Bytes");
addPaletteItem(baseN.OctalToBytesTransform, "Octal", "Octal > Bytes");
addPaletteItem(baseN.DecimalToBytesTransform, "Decimal", "Decimal > Bytes");
addPaletteItem(hex.HexToBytesTransform, "Hex", "Hex > Bytes");

addPaletteItem(baseN.Base32ToBytesTransform, "Base32", "Base32 > Bytes");
addPaletteItem(baseN.Base32HexToBytesTransform, "Base32-HEX", "Base32-HEX > Bytes");
addPaletteItem(baseN.Base64ToBytesTransform, "Base64", "Base64 > Bytes");
addPaletteItem(baseN.Base64UrlToBytesTransform, "Base64 URL", "Base64 URL > Bytes");

addPaletteCategory("Bytes to text");
addPaletteItem(ascii.BytesToAsciiTransform, "ASCII", "Bytes > ASCII");
addPaletteItem(codepages.BytesToCodePageTransform, "Code page", "Bytes > Code page");
addPaletteItem(unicode.BytesToUcs2Transform, "UCS-2", "Bytes > UCS-2");
addPaletteItem(unicode.BytesToUtf8Transform, "UTF-8", "Bytes > UTF-8");
addPaletteItem(unicode.BytesToUtf16Transform, "UTF-16", "Bytes > UTF-16");

addPaletteItem(numbers.BytesToBinaryNumbersTransform, "Binary Numbers", "Bytes > Binary Numbers");
addPaletteItem(numbers.BytesToOctalNumbersTransform, "Octal Numbers", "Bytes > Octal Numbers");
addPaletteItem(numbers.BytesToDecimalNumbersTransform, "Decimal Numbers", "Bytes > Decimal Numbers");
addPaletteItem(numbers.BytesToHexNumbersTransform, "Hex Numbers", "Bytes > Hex Numbers");

addPaletteItem(binary.BytesToBinaryTransform, "Binary", "Bytes > Binary");
addPaletteItem(baseN.BytesToOctalTransform, "Octal", "Bytes > Octal");
addPaletteItem(baseN.BytesToDecimalTransform, "Decimal", "Bytes > Decimal");
addPaletteItem(hex.BytesToHexTransform, "Hex", "Bytes > Hex");

addPaletteItem(baseN.BytesToBase32Transform, "Base32", "Bytes > Base32");
addPaletteItem(baseN.BytesToBase32HexTransform, "Base32-HEX", "Bytes > Base32-HEX");
addPaletteItem(baseN.BytesToBase64Transform, "Base64", "Bytes > Base64");
addPaletteItem(baseN.BytesToBase64UrlTransform, "Base64 URL", "Bytes > Base64 URL");

addPaletteCategory("Checksums");
addPaletteItem(crc.CrcTransform, "CRC", "CRC");

addPaletteCategory("Hashes");
addPaletteItem(haval.HavalTransform, "HAVAL", "HAVAL");
addPaletteItem(keccak.KeccakTransform, "Keccak", "Keccak");
addPaletteItem(md2.Md2Transform, "MD2", "MD2");
addPaletteItem(md4.Md4Transform, "MD4", "MD4");
addPaletteItem(md5.Md5Transform, "MD5", "MD5");
addPaletteItem(ripemd128.RipeMd128Transform, "RIPEMD-128", "RIPEMD-128");
addPaletteItem(ripemd160.RipeMd160Transform, "RIPEMD-160", "RIPEMD-160");
addPaletteItem(ripemd128.RipeMd256Transform, "RIPEMD-256", "RIPEMD-256");
addPaletteItem(ripemd160.RipeMd320Transform, "RIPEMD-320", "RIPEMD-320");
addPaletteItem(sha1.Sha0Transform, "SHA-0", "SHA-0");
addPaletteItem(sha1.Sha1Transform, "SHA-1", "SHA-1");
addPaletteItem(sha2.Sha2Transform, "SHA-2", "SHA-2");
addPaletteItem(sha3.Sha3Transform, "SHA-3");
addPaletteItem(sha3.ShakeTransform, "SHAKE", "SHAKE");

addPaletteCategory("String manipulation");
addPaletteItem(stringManipulation.RemoveCharsTransform, "Remove characters");
addPaletteItem(stringManipulation.SimpleTranspositionTransform, "Simple transpositions");

addPaletteCategory("Classical two-way");
addPaletteItem(rotx.RotXTransform, "ROT-X");
addPaletteItem(rotx.Rot5Transform, "ROT-5");
addPaletteItem(rotx.Rot18Transform, "ROT-18");
addPaletteItem(rotx.Rot47Transform, "ROT-47");

addPaletteCategory("Classical decryption");
addPaletteItem(affine.AffineDecryptTransform, "Affine", "Affine Decrypt");
addPaletteItem(bifid.BifidDecryptTransform, "Bifid", "Bifid Decrypt");
addPaletteItem(skip.SkipDecryptTransform, "Skip", "Skip Cipher Decrypt");
addPaletteItem(vigenere.VigenereDecryptTransform, "Vigènere", "Vigènere Decrypt");

addPaletteCategory("Classical encryption");
addPaletteItem(affine.AffineEncryptTransform, "Affine", "Affine Encrypt");
addPaletteItem(bifid.BifidEncryptTransform, "Bifid", "Bifid Encrypt");
addPaletteItem(columns.ColumnarTranspositionEncryptTransform, "Columnar Transposition", "Columnar Transposition Encrypt");
addPaletteItem(substitution.SimpleSubstitutionTransform, "Simple Substitution");
addPaletteItem(skip.SkipEncryptTransform, "Skip", "Skip Cipher Encrypt");
addPaletteItem(vigenere.VigenereEncryptTransform, "Vigènere", "Vigènere Encrypt");

addPaletteCategory("Mechanical");
addPaletteItem(enigma.EnigmaTransform, "Enigma", "Enigma Machine");

addPaletteCategory("Modern two-way");
addPaletteItem(xor.XorTransform, "XOR");

addPaletteCategory("Modern decryption");
addPaletteItem(nativeAes.NativeAesCbcDecryptTransform, "AES (CBC)", "AES (CBC) Decrypt");
//addPaletteItem(nativeAes.NativeAesCfbDecryptTransform, "AES (CFB-8)", "AES (CFB-8) Decrypt");
addPaletteItem(nativeAes.NativeAesCtrDecryptTransform, "AES (CTR)", "AES (CTR) Decrypt");
addPaletteItem(nativeAes.NativeAesGcmDecryptTransform, "AES (GCM)", "AES (GCM) Decrypt");
addPaletteItem(rijndael.RijndaelDecryptTransform, "Pure Rijndael", "Pure Rijndael Decrypt");
//addPaletteItem(nativeRsa.NativeRsaOaepDecryptTransform, "RSA (OAEP)", "RSA (OAEP) Decrypt");

addPaletteCategory("Modern encryption");
addPaletteItem(nativeAes.NativeAesCbcEncryptTransform, "AES (CBC)", "AES (CBC) Encrypt");
//addPaletteItem(nativeAes.NativeAesCfbEncryptTransform, "AES (CFB)", "AES (CFB) Encrypt");
addPaletteItem(nativeAes.NativeAesCtrEncryptTransform, "AES (CTR)", "AES (CTR) Encrypt");
addPaletteItem(nativeAes.NativeAesGcmEncryptTransform, "AES (GCM)", "AES (GCM) Encrypt");
addPaletteItem(rijndael.RijndaelEncryptTransform, "Pure Rijndael", "Pure Rijndael Encrypt");
addPaletteItem(nativeRsa.NativeRsaOaepEncryptTransform, "RSA (OAEP)", "RSA (OAEP) Encrypt");
