import "../styles/main.scss";

import * as a5 from "./transforms/stream-ciphers/a5";
import * as adler32 from "./transforms/checksums/adler-32";
import * as affine from "./transforms/classical/affine";
import * as ascii from "./transforms/char-encodings/ascii";
import * as adfgvx from "./transforms/classical/adfgvx";
import * as baseN from "./transforms/base-n";
import * as bifid from "./transforms/classical/bifid";
import * as binary from "./transforms/binary";
import * as blake from "./transforms/hashes/blake";
import * as blake2 from "./transforms/hashes/blake2";
import * as blowfish from "./transforms/block-ciphers/blowfish";
import * as bsd from "./transforms/checksums/bsd";
import * as camellia from "./transforms/block-ciphers/camellia";
import * as cast128 from "./transforms/block-ciphers/cast-128";
import * as cast256 from "./transforms/block-ciphers/cast-256";
import * as chacha from "./transforms/stream-ciphers/chacha";
import * as codepages from "./transforms/char-encodings/codepages";
import * as columns from "./transforms/classical/columns";
import * as crc from "./transforms/checksums/crc";
import * as des from "./transforms/block-ciphers/des";
import * as ebcdic from "./transforms/char-encodings/ebcdic";
import * as enigma from "./transforms/mechanical/enigma";
import * as feal from "./transforms/block-ciphers/feal";
import * as fletcher from "./transforms/checksums/fletcher";
import * as has160 from "./transforms/hashes/has-160";
import * as haval from "./transforms/hashes/haval";
import * as hex from "./transforms/hex";
import * as hill from "./transforms/classical/hill";
import * as ice from "./transforms/block-ciphers/ice";
import * as idea from "./transforms/block-ciphers/idea";
import * as iraqi from "./transforms/block-ciphers/iraqi";
import * as jis from "./transforms/char-encodings/jis";
import * as k12 from "./transforms/hashes/kangaroo-twelve";
import * as keccak from "./transforms/hashes/keccak";
import * as khufu from "./transforms/block-ciphers/khufu";
import * as kuznyechik from "./transforms/block-ciphers/kuznyechik";
import * as letterNumber from "./transforms/classical/letter-number";
import * as loki from "./transforms/block-ciphers/loki";
import * as lucifer from "./transforms/block-ciphers/lucifer";
import * as madryga from "./transforms/block-ciphers/madryga";
import * as magma from "./transforms/block-ciphers/magma";
import * as md2 from "./transforms/hashes/md2";
import * as md4 from "./transforms/hashes/md4";
import * as md5 from "./transforms/hashes/md5";
import * as morse from "./transforms/char-encodings/morse";
import * as nativeAes from "./transforms/browser-native/aes";
import * as nativeRsa from "./transforms/browser-native/rsa";
import * as newdes from "./transforms/block-ciphers/newdes";
import * as noekeon from "./transforms/block-ciphers/noekeon";
import * as numbers from "./transforms/numbers";
import * as padding from "./transforms/tools/padding";
import * as playfair from "./transforms/classical/playfair";
import * as polybius from "./transforms/classical/polybius";
import * as present from "./transforms/block-ciphers/present";
import * as railfence from "./transforms/classical/railfence";
import * as rc2 from "./transforms/block-ciphers/rc2";
import * as rc4 from "./transforms/stream-ciphers/rc4";
import * as rc5 from "./transforms/block-ciphers/rc5";
import * as rc6 from "./transforms/block-ciphers/rc6";
import * as redpike from "./transforms/block-ciphers/red-pike";
import * as rijndael from "./transforms/block-ciphers/rijndael";
import * as ripemd from "./transforms/hashes/ripemd";
import * as ripemdN from "./transforms/hashes/ripemd-n";
import * as rotx from "./transforms/classical/rotx";
import * as safer from "./transforms/block-ciphers/safer";
import * as salsa20 from "./transforms/stream-ciphers/salsa20";
import * as serpent from "./transforms/block-ciphers/serpent";
import * as sha1 from "./transforms/hashes/sha-1";
import * as sha2 from "./transforms/hashes/sha-2";
import * as sha3 from "./transforms/hashes/sha-3";
import * as shark from "./transforms/block-ciphers/shark";
import * as simon from "./transforms/block-ciphers/simon";
import * as skip from "./transforms/classical/skip";
import * as skipjack from "./transforms/block-ciphers/skipjack";
import * as speck from "./transforms/block-ciphers/speck";
import * as square from "./transforms/block-ciphers/square";
import * as stringManipulation from "./transforms/tools/string-manipulation";
import * as substitution from "./transforms/classical/simple-substitution";
import * as tea from "./transforms/block-ciphers/tea";
import * as threefish from "./transforms/block-ciphers/threefish";
import * as threeway from "./transforms/block-ciphers/3-way";
import * as tiger from "./transforms/hashes/tiger";
import * as treyfer from "./transforms/block-ciphers/treyfer";
import * as trifid from "./transforms/classical/trifid";
import * as twofish from "./transforms/block-ciphers/twofish";
import * as unicode from "./transforms/char-encodings/unicode";
import * as vigenere from "./transforms/classical/vigenere";
import * as whirlpool from "./transforms/hashes/whirlpool";
import * as xor from "./transforms/stream-ciphers/xor";
import * as xtea from "./transforms/block-ciphers/xtea";
import * as xxtea from "./transforms/block-ciphers/xxtea";

import * as generators from "./transforms/generators";

import { NodeEditor } from "./ui/jither.node-editor";
import { PropertyPanel } from "./ui/cryptopunk.property-panel";
import { Palette } from "./ui/cryptopunk.palette";
import { NodeController } from "./ui/cryptopunk.node-controller";

const elePalette = document.getElementById("palette");
const eleNodes = document.getElementById("nodes");
const eleProperties = document.getElementById("properties");

const propertyPanel = new PropertyPanel(eleProperties);
const editor = new NodeEditor(eleNodes);
const palette = new Palette(elePalette);

editor.selectedNodeChanged.add(node => propertyPanel.updateProperties(node));
palette.itemClicked.add(paletteItemClickedListener);

const btnNew = document.getElementById("btn-new"),
	btnLoad = document.getElementById("btn-load"),
	btnSave = document.getElementById("btn-save");

btnNew.addEventListener("click", newClickedListener);
btnLoad.addEventListener("click", loadClickedListener);
btnSave.addEventListener("click", saveClickedListener);

function newClickedListener(e)
{
	e.preventDefault();
	editor.clear();
}

function loadClickedListener(e)
{
	e.preventDefault();

	const json = localStorage.getItem("savedWorkspace");
	const data = JSON.parse(json);
	editor.load(data, (controllerData, caption, x, y) =>
	{
		const transformClass = palette.getClass(controllerData.transform);
		const controller = createNode(transformClass, caption, x, y);
		controller.load(controllerData);
		return controller.node;
	});
}

function saveClickedListener(e)
{
	e.preventDefault();

	const data = editor.save();
	localStorage.setItem("savedWorkspace", JSON.stringify(data));
}

function nodeOutputChangedListener(node)
{
	propertyPanel.updateOutputs(node);
}

function paletteItemClickedListener(item)
{
	const transformClass = item.data;
	const caption = item.caption;
	createNode(transformClass, caption, 50, 300);
}

function createNode(transformClass, caption, x, y)
{
	const controller = new NodeController(editor, caption, new transformClass(), { x, y });
	controller.nodeOutputChanged.add(nodeOutputChangedListener);
	return controller;
}

palette.addCategory("Generators")
	.addItem(generators.KeyboardInputGenerator, "KeyboardInput", "Keyboard Input")
	.addItem(generators.HexInputGenerator, "HexInput", "Hex Input")
	.addItem(generators.KeyedAlphabetGenerator, "KeyedAlphabet", "Keyed Alphabet")
	.addItem(generators.NullBytesGenerator, "NullBytes", "Null Bytes")
	.addItem(generators.RandomBytesGenerator, "RandomBytes", "Random Bytes");

palette.addCategory("Text to bytes")
	.addItem(ascii.AsciiToBytesTransform, "AsciiToBytes", "ASCII", "ASCII > Bytes")
	.addItem(codepages.CodePageToBytesTransform, "CodePageToBytes", "Code page", "Code page > Bytes")
	.addItem(ebcdic.EbcdicToBytesTransform, "EbcdicToBytes", "EBCDIC", "EBCDIC > Bytes")
	.addItem(jis.ShiftJisToBytesTransform, "ShiftJisToBytes", "Shift JIS", "Shift JIS > Bytes")
	.addItem(jis.EucJpToBytesTransform, "EucJpToBytes", "EUC-JP", "EUC-JP > Bytes")
	.addItem(unicode.Ucs2ToBytesTransform, "Ucs2ToBytes", "UCS-2", "UCS-2 > Bytes")
	.addItem(unicode.Utf8ToBytesTransform, "Utf8ToBytes", "UTF-8", "UTF-8 > Bytes")
	.addItem(unicode.Utf16ToBytesTransform, "Utf16ToBytes", "UTF-16", "UTF-16 > Bytes")
	.addItem(unicode.Utf32ToBytesTransform, "Utf32ToBytes", "UTF-32", "UTF-32 > Bytes")

	.addItem(numbers.BinaryNumbersToBytesTransform, "BinaryNumbersToBytes", "Binary Numbers", "Binary Numbers > Bytes")
	.addItem(numbers.OctalNumbersToBytesTransform, "OctalNumbersToBytes", "Octal Numbers", "Octal Numbers > Bytes")
	.addItem(numbers.DecimalNumbersToBytesTransform, "DecimalNumbersToBytes", "Decimal Numbers", "Decimal Numbers > Bytes")
	.addItem(numbers.HexNumbersToBytesTransform, "HexNumbersToBytes", "Hex Numbers", "Hex Numbers > Bytes")

	.addItem(binary.BinaryToBytesTransform, "BinaryToBytes", "Binary", "Binary > Bytes")
	.addItem(baseN.OctalToBytesTransform, "OctalToBytes", "Octal", "Octal > Bytes")
	.addItem(baseN.DecimalToBytesTransform, "DecimalToBytes", "Decimal", "Decimal > Bytes")
	.addItem(hex.HexToBytesTransform, "HexToBytes", "Hex", "Hex > Bytes")

	.addItem(baseN.Base32ToBytesTransform, "Base32ToBytes", "Base32", "Base32 > Bytes")
	.addItem(baseN.Base32HexToBytesTransform, "Base32HexToBytes", "Base32-HEX", "Base32-HEX > Bytes")
	.addItem(baseN.Base58ToBytesTransform, "Base58ToBytes", "Base58", "Base58 > Bytes")
	.addItem(baseN.Base62ToBytesTransform, "Base62ToBytes", "Base62", "Base62 > Bytes")
	.addItem(baseN.Base64ToBytesTransform, "Base64ToBytes", "Base64", "Base64 > Bytes")
	.addItem(baseN.Base64UrlToBytesTransform, "Base64UrlToBytes", "Base64 URL", "Base64 URL > Bytes");

palette.addCategory("Bytes to text")
	.addItem(ascii.BytesToAsciiTransform, "BytesToAscii", "ASCII", "Bytes > ASCII")
	.addItem(codepages.BytesToCodePageTransform, "BytesToCodePage", "Code page", "Bytes > Code page")
	.addItem(ebcdic.BytesToEbcdicTransform, "BytesToEbcdic", "EBCDIC", "Bytes > EBCDIC")
	.addItem(jis.BytesToShiftJisTransform, "BytesToShiftJis", "Shift JIS", "Bytes > Shift JIS")
	.addItem(jis.BytesToEucJpTransform, "BytesToEucJp", "EUC-JP", "Bytes > EUC-JP")
	.addItem(unicode.BytesToUcs2Transform, "BytesToUcs2", "UCS-2", "Bytes > UCS-2")
	.addItem(unicode.BytesToUtf8Transform, "BytesToUtf8", "UTF-8", "Bytes > UTF-8")
	.addItem(unicode.BytesToUtf16Transform, "BytesToUtf16", "UTF-16", "Bytes > UTF-16")
	.addItem(unicode.BytesToUtf32Transform, "BytesToUtf32", "UTF-32", "Bytes > UTF-32")

	.addItem(numbers.BytesToBinaryNumbersTransform, "BytesToBinaryNumbers", "Binary Numbers", "Bytes > Binary Numbers")
	.addItem(numbers.BytesToOctalNumbersTransform, "BytesToOctalNumbers", "Octal Numbers", "Bytes > Octal Numbers")
	.addItem(numbers.BytesToDecimalNumbersTransform, "BytesToDecimalNumbers", "Decimal Numbers", "Bytes > Decimal Numbers")
	.addItem(numbers.BytesToHexNumbersTransform, "BytesToHexNumbers", "Hex Numbers", "Bytes > Hex Numbers")

	.addItem(binary.BytesToBinaryTransform, "BytesToBinary", "Binary", "Bytes > Binary")
	.addItem(baseN.BytesToOctalTransform, "BytesToOctal", "Octal", "Bytes > Octal")
	.addItem(baseN.BytesToDecimalTransform, "BytesToDecimal", "Decimal", "Bytes > Decimal")
	.addItem(hex.BytesToHexTransform, "BytesToHex", "Hex", "Bytes > Hex")

	.addItem(baseN.BytesToBase32Transform, "BytesToBase32", "Base32", "Bytes > Base32")
	.addItem(baseN.BytesToBase32HexTransform, "BytesToBase32Hex", "Base32-HEX", "Bytes > Base32-HEX")
	.addItem(baseN.BytesToBase58Transform, "BytesToBase58", "Base58", "Bytes > Base58")
	.addItem(baseN.BytesToBase62Transform, "BytesToBase62", "Base62", "Bytes > Base62")
	.addItem(baseN.BytesToBase64Transform, "BytesToBase64", "Base64", "Bytes > Base64")
	.addItem(baseN.BytesToBase64UrlTransform, "BytesToBase64Url", "Base64 URL", "Bytes > Base64 URL");

palette.addCategory("Writing system to text")
	.addItem(morse.MorseToTextTransform, "MorseToText", "Morse", "Morse > Text");

palette.addCategory("Text to writing system")
	.addItem(morse.TextToMorseTransform, "TextToMorse", "Morse", "Text > Morse");

palette.addCategory("Checksums")
	.addItem(adler32.Adler32Transform, "Adler32", "Adler-32", "Adler-32")
	.addItem(bsd.BsdTransform, "Bsd", "BSD", "BSD checksum")
	.addItem(crc.CrcTransform, "Crc", "CRC", "CRC")
	.addItem(fletcher.FletcherTransform, "Fletcher", "Fletcher", "Fletcher checksum");

palette.addCategory("Hashes")
	.addItem(blake.BlakeTransform, "Blake", "BLAKE", "BLAKE")
	.addItem(blake2.Blake2Transform, "Blake2", "BLAKE2", "BLAKE2")
	.addItem(has160.Has160Transform, "Has160", "HAS-160", "HAS-160")
	.addItem(haval.HavalTransform, "Haval", "HAVAL", "HAVAL")
	.addItem(k12.KangarooTwelveTransform, "KangarooTwelve", "Kangaroo Twelve")
	.addItem(keccak.KeccakTransform, "Keccak", "Keccak", "Keccak")
	.addItem(md2.Md2Transform, "Md2", "MD2", "MD2")
	.addItem(md4.Md4Transform, "Md4", "MD4", "MD4")
	.addItem(md5.Md5Transform, "Md5", "MD5", "MD5")
	.addItem(ripemd.RipeMdTransform, "RipeMd", "RIPEMD (original)", "RIPEMD (original)")
	.addItem(ripemdN.RipeMdNTransform, "RipeMdN", "RIPEMD-N", "RIPEMD-N")
	.addItem(sha1.Sha0Transform, "Sha0", "SHA-0", "SHA-0")
	.addItem(sha1.Sha1Transform, "Sha1", "SHA-1", "SHA-1")
	.addItem(sha2.Sha2Transform, "Sha2", "SHA-2", "SHA-2")
	.addItem(sha3.Sha3Transform, "Sha3", "SHA-3")
	.addItem(sha3.ShakeTransform, "Shake", "SHAKE", "SHAKE")
	.addItem(tiger.TigerTransform, "Tiger", "Tiger", "Tiger")
	.addItem(whirlpool.WhirlpoolTransform, "Whirlpool", "WHIRLPOOL", "WHIRLPOOL");

palette.addCategory("String manipulation")
	.addItem(stringManipulation.ChangeCaseTransform, "ChangeCase", "Change case")
	.addItem(stringManipulation.RemoveCharsTransform, "RemoveChars", "Remove characters")
	.addItem(stringManipulation.SimpleTranspositionTransform, "SimpleTransposition", "Simple transpositions");

palette.addCategory("Bytes manipulation")
	.addItem(padding.PaddingAddTransform, "PaddingAdd", "Add Padding")
	.addItem(padding.PaddingRemoveTransform, "PaddingRemove", "Remove Padding");

palette.addCategory("Classical two-way")
	.addItem(rotx.RotXTransform, "RotX", "ROT-X")
	.addItem(rotx.Rot5Transform, "Rot5", "ROT-5")
	.addItem(rotx.Rot13Transform, "Rot13", "ROT-13")
	.addItem(rotx.Rot18Transform, "Rot18", "ROT-18")
	.addItem(rotx.Rot47Transform, "Rot47", "ROT-47");

palette.addCategory("Classical decryption")
	.addItem(adfgvx.AdfgvxDecryptTransform, "AdfgvxDecrypt", "ADFGVX", "ADFGVX Decrypt")
	.addItem(affine.AffineDecryptTransform, "AffineDecrypt", "Affine", "Affine Decrypt")
	.addItem(bifid.BifidDecryptTransform, "BifidDecrypt", "Bifid", "Bifid Decrypt")
	.addItem(columns.ColumnarTranspositionDecryptTransform, "ColumnarTranspositionDecrypt", "Columnar Transposition", "Columnar Transposition Decrypt")
	.addItem(hill.HillDecryptTransform, "HillDecrypt", "Hill", "Hill Decrypt")
	.addItem(letterNumber.LetterNumberDecryptTransform, "LetterNumberDecrypt", "Letter-Number", "Letter-Number Decrypt")
	.addItem(playfair.PlayfairDecryptTransform, "PlayfairDecrypt", "Playfair", "Playfair Decrypt")
	.addItem(polybius.PolybiusDecryptTransform, "PolybiusDecrypt", "Polybius", "Polybius Decrypt")
	.addItem(railfence.RailFenceDecryptTransform, "RailFenceDecrypt", "Rail fence", "Rail fence Decrypt")
	.addItem(skip.SkipDecryptTransform, "SkipDecrypt", "Skip", "Skip Cipher Decrypt")
	.addItem(trifid.TrifidDecryptTransform, "TrifidDecrypt", "Trifid", "Trifid Decrypt")
	.addItem(vigenere.VigenereDecryptTransform, "VigenereDecrypt", "Vigènere", "Vigènere Decrypt");

palette.addCategory("Classical encryption")
	.addItem(adfgvx.AdfgvxEncryptTransform, "AdfgvxEncrypt", "ADFGVX", "ADFGVX Encrypt")
	.addItem(affine.AffineEncryptTransform, "AffineEncrypt", "Affine", "Affine Encrypt")
	.addItem(bifid.BifidEncryptTransform, "BifidEncrypt", "Bifid", "Bifid Encrypt")
	.addItem(columns.ColumnarTranspositionEncryptTransform, "ColumnarTranspositionEncrypt", "Columnar Transposition", "Columnar Transposition Encrypt")
	.addItem(hill.HillEncryptTransform, "HillEncrypt", "Hill", "Hill Encrypt")
	.addItem(letterNumber.LetterNumberEncryptTransform, "LetterNumberEncrypt", "Letter-Number", "Letter-Number Encrypt")
	.addItem(playfair.PlayfairEncryptTransform, "PlayfairEncrypt", "Playfair", "Playfair Encrypt")
	.addItem(polybius.PolybiusEncryptTransform, "PolybiusEncrypt", "Polybius", "Polybius Encrypt")
	.addItem(railfence.RailFenceEncryptTransform, "RailFenceEncrypt", "Rail fence", "Rail fence Encrypt")
	.addItem(substitution.SimpleSubstitutionTransform, "SimpleSubstitutionEncrypt", "Simple Substitution")
	.addItem(skip.SkipEncryptTransform, "SkipEncrypt", "Skip", "Skip Cipher Encrypt")
	.addItem(trifid.TrifidEncryptTransform, "TrifidEncrypt", "Trifid", "Trifid Encrypt")
	.addItem(vigenere.VigenereEncryptTransform, "VigenereEncrypt", "Vigènere", "Vigènere Encrypt");

palette.addCategory("Mechanical")
	.addItem(enigma.EnigmaTransform, "Enigma", "Enigma", "Enigma Machine");

palette.addCategory("Stream ciphers")
	.addItem(a5.A51Transform, "A51", "A5/1")
	.addItem(a5.A52Transform, "A52", "A5/2")
	.addItem(rc4.Rc4Transform, "Rc4", "RC4")
	.addItem(chacha.ChaChaTransform, "ChaCha", "ChaCha / XChaCha", "ChaCha")
	.addItem(salsa20.Salsa20Transform, "Salsa20", "Salsa20 / XSalsa20", "Salsa20")
	.addItem(xor.XorTransform, "Xor", "XOR");

palette.addCategory("Block cipher decryption")
	.addItem(threeway.ThreeWayDecryptTransform, "ThreeWayDecrypt", "3-Way", "3-Way Decrypt")
	.addItem(nativeAes.NativeAesCbcDecryptTransform, "NativeAesCbcDecrypt", "AES (CBC)", "AES (CBC) Decrypt")
//	.addItem(nativeAes.NativeAesCfbDecryptTransform, "AES (CFB-8)", "AES (CFB-8) Decrypt")
	.addItem(nativeAes.NativeAesCtrDecryptTransform, "NativeAesCtrDecrypt", "AES (CTR)", "AES (CTR) Decrypt")
	.addItem(nativeAes.NativeAesGcmDecryptTransform, "NativeAesGcmDecrypt", "AES (GCM)", "AES (GCM) Decrypt")
	.addItem(blowfish.BlowfishDecryptTransform, "BlowfishDecrypt", "Blowfish", "Blowfish Decrypt")
	.addItem(camellia.CamelliaDecryptTransform, "CamelliaDecrypt", "Camellia", "Camellia Decrypt")
	.addItem(cast128.Cast128DecryptTransform, "Cast128Decrypt", "CAST-128", "CAST-128 Decrypt")
	.addItem(cast256.Cast256DecryptTransform, "Cast256Decrypt", "CAST-256", "CAST-256 Decrypt")
	.addItem(des.DesDecryptTransform, "DesDecrypt", "DES", "DES Decrypt")
	.addItem(des.DesXDecryptTransform, "DesXDecrypt", "DES-X", "DES-X Decrypt")
	.addItem(feal.FealDecryptTransform, "FealDecrypt", "FEAL", "FEAL Decrypt")
	.addItem(ice.IceDecryptTransform, "IceDecrypt", "ICE", "ICE Decrypt")
	.addItem(idea.IdeaDecryptTransform, "IdeaDecrypt", "IDEA", "IDEA Decrypt")
	.addItem(iraqi.IraqiDecryptTransform, "IraqiDecrypt", "Iraqi", "Iraqi Decrypt")
	.addItem(khufu.KhafreDecryptTransform, "KhafreDecrypt", "Khafre", "Khafre Decrypt")
	.addItem(khufu.KhufuDecryptTransform, "KhufuDecrypt", "Khufu", "Khufu Decrypt")
	.addItem(kuznyechik.KuznyechikDecryptTransform, "KuznyechikDecrypt", "Kuznyechik", "Kuznyechik Decrypt")
	.addItem(loki.LokiDecryptTransform, "LokiDecrypt", "LOKI", "LOKI Decrypt")
	.addItem(lucifer.LuciferDecryptTransform, "LuciferDecrypt", "LUCIFER", "LUCIFER Decrypt")
	.addItem(madryga.MadrygaDecryptTransform, "MadrygaDecrypt", "Madryga", "Madryga Decrypt")
	.addItem(magma.MagmaDecryptTransform, "MagmaDecrypt", "Magma (GOST)", "Magma (GOST) Decrypt")
	.addItem(newdes.NewDesDecryptTransform, "NewDesDecrypt", "NewDES", "NewDES Decrypt")
	.addItem(noekeon.NoekeonDecryptTransform, "NoekeonDecrypt", "NOEKEON", "NOEKEON Decrypt")
	.addItem(present.PresentDecryptTransform, "PresentDecrypt", "PRESENT", "PRESENT Decrypt")
	.addItem(rc2.Rc2DecryptTransform, "Rc2Decrypt", "RC2", "RC2 Decrypt")
	.addItem(rc5.Rc5DecryptTransform, "Rc5Decrypt", "RC5", "RC5 Decrypt")
	.addItem(rc6.Rc6DecryptTransform, "Rc6Decrypt", "RC6", "RC6 Decrypt")
	.addItem(redpike.RedPikeDecryptTransform, "RedPikeDecrypt", "Red Pike", "Red Pike Decrypt")
	.addItem(rijndael.RijndaelDecryptTransform, "RijndaelDecrypt", "Rijndael", "Rijndael Decrypt")
	.addItem(safer.SaferDecryptTransform, "SaferDecrypt", "SAFER", "SAFER Decrypt")
	.addItem(serpent.SerpentDecryptTransform, "SerpentDecrypt", "Serpent", "Serpent Decrypt")
	.addItem(shark.SharkDecryptTransform, "SharkDecrypt", "SHARK", "SHARK Decrypt")
	.addItem(simon.SimonDecryptTransform, "SimonDecrypt", "Simon", "Simon Decrypt")
	.addItem(skipjack.SkipjackDecryptTransform, "SkipjackDecrypt", "Skipjack", "Skipjack Decrypt")
	.addItem(speck.SpeckDecryptTransform, "SpeckDecrypt", "Speck", "Speck Decrypt")
	.addItem(square.SquareDecryptTransform, "SquareDecrypt", "SQUARE", "SQUARE Decrypt")
	.addItem(tea.TeaDecryptTransform, "TeaDecrypt", "TEA", "TEA Decrypt")
	.addItem(threefish.ThreefishDecryptTransform, "ThreefishDecrypt", "Threefish", "Threefish Decrypt")
	.addItem(treyfer.TreyferDecryptTransform, "TreyferDecrypt", "Treyfer", "Treyfer Decrypt")
	.addItem(twofish.TwofishDecryptTransform, "TwofishDecrypt", "Twofish", "Twofish Decrypt")
	.addItem(xtea.XTeaDecryptTransform, "XTeaDecrypt", "XTEA", "XTEA Decrypt")
	.addItem(xxtea.XXTeaDecryptTransform, "XXTeaDecrypt", "XXTEA", "XXTEA Decrypt");
//	.addItem(nativeRsa.NativeRsaOaepDecryptTransform, "RSA (OAEP)", "RSA (OAEP) Decrypt")

palette.addCategory("Block cipher encryption")
	.addItem(threeway.ThreeWayEncryptTransform, "ThreeWayEncrypt", "3-Way", "3-Way Encrypt")
	.addItem(nativeAes.NativeAesCbcEncryptTransform, "NativeAesCbcEncrypt", "AES (CBC)", "AES (CBC) Encrypt")
//	.addItem(nativeAes.NativeAesCfbEncryptTransform, "AES (CFB)", "AES (CFB) Encrypt")
	.addItem(nativeAes.NativeAesCtrEncryptTransform, "NativeAesCtrEncrypt", "AES (CTR)", "AES (CTR) Encrypt")
	.addItem(nativeAes.NativeAesGcmEncryptTransform, "NativeAesGcmEncrypt", "AES (GCM)", "AES (GCM) Encrypt")
	.addItem(blowfish.BlowfishEncryptTransform, "BlowfishEncrypt", "Blowfish", "Blowfish Encrypt")
	.addItem(camellia.CamelliaEncryptTransform, "CamelliaEncrypt", "Camellia", "Camellia Encrypt")
	.addItem(cast128.Cast128EncryptTransform, "Cast128Encrypt", "CAST-128", "CAST-128 Encrypt")
	.addItem(cast256.Cast256EncryptTransform, "Cast256Encrypt", "CAST-256", "CAST-256 Encrypt")
	.addItem(des.DesEncryptTransform, "DesEncrypt", "DES", "DES Encrypt")
	.addItem(des.DesXEncryptTransform, "DesXEncrypt", "DES-X", "DES-X Encrypt")
	.addItem(feal.FealEncryptTransform, "FealEncrypt", "FEAL", "FEAL Encrypt")
	.addItem(ice.IceEncryptTransform, "IceEncrypt", "ICE", "ICE Encrypt")
	.addItem(idea.IdeaEncryptTransform, "IdeaEncrypt", "IDEA", "IDEA Encrypt")
	.addItem(iraqi.IraqiEncryptTransform, "IraqiEncrypt", "Iraqi", "Iraqi Encrypt")
	.addItem(khufu.KhafreEncryptTransform, "KhafreEncrypt", "Khafre", "Khafre Encrypt")
	.addItem(khufu.KhufuEncryptTransform, "KhufuEncrypt", "Khufu", "Khufu Encrypt")
	.addItem(kuznyechik.KuznyechikEncryptTransform, "KuznyechikEncrypt", "Kuznyechik", "Kuznyechik Encrypt")
	.addItem(loki.LokiEncryptTransform, "LokiEncrypt", "LOKI", "LOKI Encrypt")
	.addItem(lucifer.LuciferEncryptTransform, "LuciferEncrypt", "LUCIFER", "LUCIFER Encrypt")
	.addItem(madryga.MadrygaEncryptTransform, "MadrygaEncrypt", "Madryga", "Madryga Encrypt")
	.addItem(magma.MagmaEncryptTransform, "MagmaEncrypt", "Magma (GOST)", "Magma (GOST) Encrypt")
	.addItem(newdes.NewDesEncryptTransform, "NewDesEncrypt", "NewDES", "NewDES Encrypt")
	.addItem(noekeon.NoekeonEncryptTransform, "NoekeonEncrypt", "NOEKEON", "NOEKEON Encrypt")
	.addItem(present.PresentEncryptTransform, "PresentEncrypt", "PRESENT", "PRESENT Encrypt")
	.addItem(rc2.Rc2EncryptTransform, "Rc2Encrypt", "RC2", "RC2 Encrypt")
	.addItem(rc5.Rc5EncryptTransform, "Rc5Encrypt", "RC5", "RC5 Encrypt")
	.addItem(rc6.Rc6EncryptTransform, "Rc6Encrypt", "RC6", "RC6 Encrypt")
	.addItem(redpike.RedPikeEncryptTransform, "RedPikeEncrypt", "Red Pike", "Red Pike Encrypt")
	.addItem(rijndael.RijndaelEncryptTransform, "RijndaelEncrypt", "Rijndael", "Rijndael Encrypt")
	.addItem(safer.SaferEncryptTransform, "SaferEncrypt", "SAFER", "SAFER Encrypt")
	.addItem(serpent.SerpentEncryptTransform, "SerpentEncrypt", "Serpent", "Serpent Encrypt")
	.addItem(shark.SharkEncryptTransform, "SharkEncrypt", "SHARK", "SHARK Encrypt")
	.addItem(skipjack.SkipjackEncryptTransform, "SkipjackEncrypt", "Skipjack", "Skipjack Encrypt")
	.addItem(simon.SimonEncryptTransform, "SimonEncrypt", "Simon", "Simon Encrypt")
	.addItem(speck.SpeckEncryptTransform, "SpeckEncrypt", "Speck", "Speck Encrypt")
	.addItem(square.SquareEncryptTransform, "SquareEncrypt", "SQUARE", "SQUARE Encrypt")
	.addItem(tea.TeaEncryptTransform, "TeaEncrypt", "TEA", "TEA Encrypt")
	.addItem(threefish.ThreefishEncryptTransform, "ThreefishEncrypt", "Threefish", "Threefish Encrypt")
	.addItem(treyfer.TreyferEncryptTransform, "TreyferEncrypt", "Treyfer", "Treyfer Encrypt")
	.addItem(twofish.TwofishEncryptTransform, "TwofishEncrypt", "Twofish", "Twofish Encrypt")
	.addItem(xtea.XTeaEncryptTransform, "XTeaEncrypt", "XTEA", "XTEA Encrypt")
	.addItem(xxtea.XXTeaEncryptTransform, "XXTeaEncrypt", "XXTEA", "XXTEA Encrypt")
	.addItem(nativeRsa.NativeRsaOaepEncryptTransform, "NativeRsaOaepEncrypt", "RSA (OAEP)", "RSA (OAEP) Encrypt");
