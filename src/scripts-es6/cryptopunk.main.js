import "../styles/main.scss";

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
import * as codepages from "./transforms/char-encodings/codepages";
import * as columns from "./transforms/classical/columns";
import * as crc from "./transforms/checksums/crc";
import * as des from "./transforms/block-ciphers/des";
import * as ebcdic from "./transforms/char-encodings/ebcdic";
import * as enigma from "./transforms/mechanical/enigma";
import * as fletcher from "./transforms/checksums/fletcher";
import * as has160 from "./transforms/hashes/has-160";
import * as haval from "./transforms/hashes/haval";
import * as hex from "./transforms/hex";
import * as hill from "./transforms/classical/hill";
import * as ice from "./transforms/block-ciphers/ice";
import * as idea from "./transforms/block-ciphers/idea";
import * as iraqi from "./transforms/block-ciphers/iraqi";
import * as jis from "./transforms/char-encodings/jis";
import * as keccak from "./transforms/hashes/keccak";
import * as khufu from "./transforms/block-ciphers/khufu";
import * as letterNumber from "./transforms/classical/letter-number";
import * as lucifer from "./transforms/block-ciphers/lucifer";
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
import * as serpent from "./transforms/block-ciphers/serpent";
import * as sha1 from "./transforms/hashes/sha-1";
import * as sha2 from "./transforms/hashes/sha-2";
import * as sha3 from "./transforms/hashes/sha-3";
import * as shark from "./transforms/block-ciphers/shark";
import * as skip from "./transforms/classical/skip";
import * as skipjack from "./transforms/block-ciphers/skipjack";
import * as speck from "./transforms/block-ciphers/speck";
import * as square from "./transforms/block-ciphers/square";
import * as stringManipulation from "./transforms/string-manipulation";
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

import * as io from "./cryptopunk.io";
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

const btnNew = document.getElementById("btn-new");
btnNew.addEventListener("click", newClickedListener);

function newClickedListener(e)
{
	e.preventDefault();
	editor.clear();
}

function nodeOutputChangedListener(node)
{
	propertyPanel.updateOutputs(node);
}

function paletteItemClickedListener(item)
{
	const transformClass = item.data;
	const caption = item.caption;
	const controller = new NodeController(editor, caption, new transformClass(), { x: 50, y: 300 });
	controller.nodeOutputChanged.add(nodeOutputChangedListener);
}

palette.addCategory("Generators")
	.addItem(generators.KeyboardInputGenerator, "Keyboard Input")
	.addItem(generators.KeyedAlphabetGenerator, "Keyed Alphabet")
	.addItem(generators.NullBytesGenerator, "Null Bytes")
	.addItem(generators.RandomBytesGenerator, "Random Bytes");

palette.addCategory("Text to bytes")
	.addItem(ascii.AsciiToBytesTransform, "ASCII", "ASCII > Bytes")
	.addItem(codepages.CodePageToBytesTransform, "Code page", "Code page > Bytes")
	.addItem(ebcdic.EbcdicToBytesTransform, "EBCDIC", "EBCDIC > Bytes")
	.addItem(jis.ShiftJisToBytesTransform, "Shift JIS", "Shift JIS > Bytes")
	.addItem(jis.EucJpToBytesTransform, "EUC-JP", "EUC-JP > Bytes")
	.addItem(unicode.Ucs2ToBytesTransform, "UCS-2", "UCS-2 > Bytes")
	.addItem(unicode.Utf8ToBytesTransform, "UTF-8", "UTF-8 > Bytes")
	.addItem(unicode.Utf16ToBytesTransform, "UTF-16", "UTF-16 > Bytes")
	.addItem(unicode.Utf32ToBytesTransform, "UTF-32", "UTF-32 > Bytes")

	.addItem(numbers.BinaryNumbersToBytesTransform, "Binary Numbers", "Binary Numbers > Bytes")
	.addItem(numbers.OctalNumbersToBytesTransform, "Octal Numbers", "Octal Numbers > Bytes")
	.addItem(numbers.DecimalNumbersToBytesTransform, "Decimal Numbers", "Decimal Numbers > Bytes")
	.addItem(numbers.HexNumbersToBytesTransform, "Hex Numbers", "Hex Numbers > Bytes")

	.addItem(binary.BinaryToBytesTransform, "Binary", "Binary > Bytes")
	.addItem(baseN.OctalToBytesTransform, "Octal", "Octal > Bytes")
	.addItem(baseN.DecimalToBytesTransform, "Decimal", "Decimal > Bytes")
	.addItem(hex.HexToBytesTransform, "Hex", "Hex > Bytes")

	.addItem(baseN.Base32ToBytesTransform, "Base32", "Base32 > Bytes")
	.addItem(baseN.Base32HexToBytesTransform, "Base32-HEX", "Base32-HEX > Bytes")
	.addItem(baseN.Base62ToBytesTransform, "Base62", "Base62 > Bytes")
	.addItem(baseN.Base64ToBytesTransform, "Base64", "Base64 > Bytes")
	.addItem(baseN.Base64UrlToBytesTransform, "Base64 URL", "Base64 URL > Bytes");

palette.addCategory("Bytes to text")
	.addItem(ascii.BytesToAsciiTransform, "ASCII", "Bytes > ASCII")
	.addItem(codepages.BytesToCodePageTransform, "Code page", "Bytes > Code page")
	.addItem(ebcdic.BytesToEbcdicTransform, "EBCDIC", "Bytes > EBCDIC")
	.addItem(jis.BytesToShiftJisTransform, "Shift JIS", "Bytes > Shift JIS")
	.addItem(jis.BytesToEucJpTransform, "EUC-JP", "Bytes > EUC-JP")
	.addItem(unicode.BytesToUcs2Transform, "UCS-2", "Bytes > UCS-2")
	.addItem(unicode.BytesToUtf8Transform, "UTF-8", "Bytes > UTF-8")
	.addItem(unicode.BytesToUtf16Transform, "UTF-16", "Bytes > UTF-16")
	.addItem(unicode.BytesToUtf32Transform, "UTF-32", "Bytes > UTF-32")

	.addItem(numbers.BytesToBinaryNumbersTransform, "Binary Numbers", "Bytes > Binary Numbers")
	.addItem(numbers.BytesToOctalNumbersTransform, "Octal Numbers", "Bytes > Octal Numbers")
	.addItem(numbers.BytesToDecimalNumbersTransform, "Decimal Numbers", "Bytes > Decimal Numbers")
	.addItem(numbers.BytesToHexNumbersTransform, "Hex Numbers", "Bytes > Hex Numbers")

	.addItem(binary.BytesToBinaryTransform, "Binary", "Bytes > Binary")
	.addItem(baseN.BytesToOctalTransform, "Octal", "Bytes > Octal")
	.addItem(baseN.BytesToDecimalTransform, "Decimal", "Bytes > Decimal")
	.addItem(hex.BytesToHexTransform, "Hex", "Bytes > Hex")

	.addItem(baseN.BytesToBase32Transform, "Base32", "Bytes > Base32")
	.addItem(baseN.BytesToBase32HexTransform, "Base32-HEX", "Bytes > Base32-HEX")
	.addItem(baseN.BytesToBase62Transform, "Base62", "Bytes > Base62")
	.addItem(baseN.BytesToBase64Transform, "Base64", "Bytes > Base64")
	.addItem(baseN.BytesToBase64UrlTransform, "Base64 URL", "Bytes > Base64 URL");

palette.addCategory("Writing system to text")
	.addItem(morse.MorseToTextTransform, "Morse", "Morse > Text");

palette.addCategory("Text to writing system")
	.addItem(morse.TextToMorseTransform, "Morse", "Text > Morse");

palette.addCategory("Checksums")
	.addItem(adler32.Adler32Transform, "Adler-32", "Adler-32")
	.addItem(bsd.BsdTransform, "BSD", "BSD checksum")
	.addItem(crc.CrcTransform, "CRC", "CRC")
	.addItem(fletcher.FletcherTransform, "Fletcher", "Fletcher checksum");

palette.addCategory("Hashes")
	.addItem(blake.BlakeTransform, "BLAKE", "BLAKE")
	.addItem(blake2.Blake2Transform, "BLAKE2", "BLAKE2")
	.addItem(has160.Has160Transform, "HAS-160", "HAS-160")
	.addItem(haval.HavalTransform, "HAVAL", "HAVAL")
	.addItem(keccak.KeccakTransform, "Keccak", "Keccak")
	.addItem(md2.Md2Transform, "MD2", "MD2")
	.addItem(md4.Md4Transform, "MD4", "MD4")
	.addItem(md5.Md5Transform, "MD5", "MD5")
	.addItem(ripemd.RipeMdTransform, "RIPEMD (original)", "RIPEMD (original)")
	.addItem(ripemdN.RipeMdNTransform, "RIPEMD-N", "RIPEMD-N")
	.addItem(sha1.Sha0Transform, "SHA-0", "SHA-0")
	.addItem(sha1.Sha1Transform, "SHA-1", "SHA-1")
	.addItem(sha2.Sha2Transform, "SHA-2", "SHA-2")
	.addItem(sha3.Sha3Transform, "SHA-3")
	.addItem(sha3.ShakeTransform, "SHAKE", "SHAKE")
	.addItem(tiger.TigerTransform, "Tiger", "Tiger")
	.addItem(whirlpool.WhirlpoolTransform, "WHIRLPOOL", "WHIRLPOOL");

palette.addCategory("String manipulation")
	.addItem(stringManipulation.ChangeCaseTransform, "Change case")
	.addItem(stringManipulation.RemoveCharsTransform, "Remove characters")
	.addItem(stringManipulation.SimpleTranspositionTransform, "Simple transpositions");

palette.addCategory("Classical two-way")
	.addItem(rotx.RotXTransform, "ROT-X")
	.addItem(rotx.Rot5Transform, "ROT-5")
	.addItem(rotx.Rot13Transform, "ROT-13")
	.addItem(rotx.Rot18Transform, "ROT-18")
	.addItem(rotx.Rot47Transform, "ROT-47");

palette.addCategory("Classical decryption")
	.addItem(adfgvx.AdfgvxDecryptTransform, "ADFGVX", "ADFGVX Decrypt")
	.addItem(affine.AffineDecryptTransform, "Affine", "Affine Decrypt")
	.addItem(bifid.BifidDecryptTransform, "Bifid", "Bifid Decrypt")
	.addItem(columns.ColumnarTranspositionDecryptTransform, "Columnar Transposition", "Columnar Transposition Decrypt")
	.addItem(hill.HillDecryptTransform, "Hill", "Hill Decrypt")
	.addItem(letterNumber.LetterNumberDecryptTransform, "Letter-Number", "Letter-Number Decrypt")
	.addItem(playfair.PlayfairDecryptTransform, "Playfair", "Playfair Decrypt")
	.addItem(polybius.PolybiusDecryptTransform, "Polybius", "Polybius Decrypt")
	.addItem(railfence.RailFenceDecryptTransform, "Rail fence", "Rail fence Decrypt")
	.addItem(skip.SkipDecryptTransform, "Skip", "Skip Cipher Decrypt")
	.addItem(trifid.TrifidDecryptTransform, "Trifid", "Trifid Decrypt")
	.addItem(vigenere.VigenereDecryptTransform, "Vigènere", "Vigènere Decrypt");

palette.addCategory("Classical encryption")
	.addItem(adfgvx.AdfgvxEncryptTransform, "ADFGVX", "ADFGVX Encrypt")
	.addItem(affine.AffineEncryptTransform, "Affine", "Affine Encrypt")
	.addItem(bifid.BifidEncryptTransform, "Bifid", "Bifid Encrypt")
	.addItem(columns.ColumnarTranspositionEncryptTransform, "Columnar Transposition", "Columnar Transposition Encrypt")
	.addItem(hill.HillEncryptTransform, "Hill", "Hill Encrypt")
	.addItem(letterNumber.LetterNumberEncryptTransform, "Letter-Number", "Letter-Number Encrypt")
	.addItem(playfair.PlayfairEncryptTransform, "Playfair", "Playfair Encrypt")
	.addItem(polybius.PolybiusEncryptTransform, "Polybius", "Polybius Encrypt")
	.addItem(railfence.RailFenceEncryptTransform, "Rail fence", "Rail fence Encrypt")
	.addItem(substitution.SimpleSubstitutionTransform, "Simple Substitution")
	.addItem(skip.SkipEncryptTransform, "Skip", "Skip Cipher Encrypt")
	.addItem(trifid.TrifidEncryptTransform, "Trifid", "Trifid Encrypt")
	.addItem(vigenere.VigenereEncryptTransform, "Vigènere", "Vigènere Encrypt");

palette.addCategory("Mechanical")
	.addItem(enigma.EnigmaTransform, "Enigma", "Enigma Machine");

palette.addCategory("Stream ciphers")
	.addItem(rc4.Rc4Transform, "RC4")
	.addItem(xor.XorTransform, "XOR");

palette.addCategory("Block cipher decryption")
	.addItem(threeway.ThreeWayDecryptTransform, "3-Way", "3-Way Decrypt")
	.addItem(nativeAes.NativeAesCbcDecryptTransform, "AES (CBC)", "AES (CBC) Decrypt")
//	.addItem(nativeAes.NativeAesCfbDecryptTransform, "AES (CFB-8)", "AES (CFB-8) Decrypt")
	.addItem(nativeAes.NativeAesCtrDecryptTransform, "AES (CTR)", "AES (CTR) Decrypt")
	.addItem(nativeAes.NativeAesGcmDecryptTransform, "AES (GCM)", "AES (GCM) Decrypt")
	.addItem(blowfish.BlowfishDecryptTransform, "Blowfish", "Blowfish Decrypt")
	.addItem(camellia.CamelliaDecryptTransform, "Camellia", "Camellia Decrypt")
	.addItem(cast128.Cast128DecryptTransform, "CAST-128", "CAST-128 Decrypt")
	.addItem(cast256.Cast256DecryptTransform, "CAST-256", "CAST-256 Decrypt")
	.addItem(des.DesDecryptTransform, "DES", "DES Decrypt")
	.addItem(des.DesXDecryptTransform, "DES-X", "DES-X Decrypt")
	.addItem(ice.IceDecryptTransform, "ICE", "ICE Decrypt")
	.addItem(idea.IdeaDecryptTransform, "IDEA", "IDEA Decrypt")
	.addItem(iraqi.IraqiDecryptTransform, "Iraqi", "Iraqi Decrypt")
	.addItem(khufu.KhafreDecryptTransform, "Khafre", "Khafre Decrypt")
	.addItem(khufu.KhufuDecryptTransform, "Khufu", "Khufu Decrypt")
	.addItem(lucifer.LuciferDecryptTransform, "LUCIFER", "LUCIFER Decrypt")
	.addItem(magma.MagmaDecryptTransform, "Magma (GOST)", "Magma (GOST) Decrypt")
	.addItem(newdes.NewDesDecryptTransform, "NewDES", "NewDES Decrypt")
	.addItem(noekeon.NoekeonDecryptTransform, "NOEKEON", "NOEKEON Decrypt")
	.addItem(present.PresentDecryptTransform, "PRESENT", "PRESENT Decrypt")
	.addItem(rc2.Rc2DecryptTransform, "RC2", "RC2 Decrypt")
	.addItem(rc5.Rc5DecryptTransform, "RC5", "RC5 Decrypt")
	.addItem(rc6.Rc6DecryptTransform, "RC6", "RC6 Decrypt")
	.addItem(redpike.RedPikeDecryptTransform, "Red Pike", "Red Pike Decrypt")
	.addItem(rijndael.RijndaelDecryptTransform, "Rijndael", "Rijndael Decrypt")
	.addItem(serpent.SerpentDecryptTransform, "Serpent", "Serpent Decrypt")
	.addItem(shark.SharkDecryptTransform, "SHARK", "SHARK Decrypt")
	.addItem(skipjack.SkipjackDecryptTransform, "Skipjack", "Skipjack Decrypt")
	.addItem(speck.SpeckDecryptTransform, "Speck", "Speck Decrypt")
	.addItem(square.SquareDecryptTransform, "SQUARE", "SQUARE Decrypt")
	.addItem(tea.TeaDecryptTransform, "TEA", "TEA Decrypt")
	.addItem(threefish.ThreefishDecryptTransform, "Threefish", "Threefish Decrypt")
	.addItem(treyfer.TreyferDecryptTransform, "Treyfer", "Treyfer Decrypt")
	.addItem(twofish.TwofishDecryptTransform, "Twofish", "Twofish Decrypt")
	.addItem(xtea.XTeaDecryptTransform, "XTEA", "XTEA Decrypt")
	.addItem(xxtea.XXTeaDecryptTransform, "XXTEA", "XXTEA Decrypt");
//	.addItem(nativeRsa.NativeRsaOaepDecryptTransform, "RSA (OAEP)", "RSA (OAEP) Decrypt")

palette.addCategory("Block cipher encryption")
	.addItem(threeway.ThreeWayEncryptTransform, "3-Way", "3-Way Encrypt")
	.addItem(nativeAes.NativeAesCbcEncryptTransform, "AES (CBC)", "AES (CBC) Encrypt")
//	.addItem(nativeAes.NativeAesCfbEncryptTransform, "AES (CFB)", "AES (CFB) Encrypt")
	.addItem(nativeAes.NativeAesCtrEncryptTransform, "AES (CTR)", "AES (CTR) Encrypt")
	.addItem(nativeAes.NativeAesGcmEncryptTransform, "AES (GCM)", "AES (GCM) Encrypt")
	.addItem(blowfish.BlowfishEncryptTransform, "Blowfish", "Blowfish Encrypt")
	.addItem(camellia.CamelliaEncryptTransform, "Camellia", "Camellia Encrypt")
	.addItem(cast128.Cast128EncryptTransform, "CAST-128", "CAST-128 Encrypt")
	.addItem(cast256.Cast256EncryptTransform, "CAST-256", "CAST-256 Encrypt")
	.addItem(des.DesEncryptTransform, "DES", "DES Encrypt")
	.addItem(des.DesXEncryptTransform, "DES-X", "DES-X Encrypt")
	.addItem(ice.IceEncryptTransform, "ICE", "ICE Encrypt")
	.addItem(idea.IdeaEncryptTransform, "IDEA", "IDEA Encrypt")
	.addItem(iraqi.IraqiEncryptTransform, "Iraqi", "Iraqi Encrypt")
	.addItem(khufu.KhafreEncryptTransform, "Khafre", "Khafre Encrypt")
	.addItem(khufu.KhufuEncryptTransform, "Khufu", "Khufu Encrypt")
	.addItem(lucifer.LuciferEncryptTransform, "LUCIFER", "LUCIFER Encrypt")
	.addItem(magma.MagmaEncryptTransform, "Magma (GOST)", "Magma (GOST) Encrypt")
	.addItem(newdes.NewDesEncryptTransform, "NewDES", "NewDES Encrypt")
	.addItem(noekeon.NoekeonEncryptTransform, "NOEKEON", "NOEKEON Encrypt")
	.addItem(present.PresentEncryptTransform, "PRESENT", "PRESENT Encrypt")
	.addItem(rc2.Rc2EncryptTransform, "RC2", "RC2 Encrypt")
	.addItem(rc5.Rc5EncryptTransform, "RC5", "RC5 Encrypt")
	.addItem(rc6.Rc6EncryptTransform, "RC6", "RC6 Encrypt")
	.addItem(redpike.RedPikeEncryptTransform, "Red Pike", "Red Pike Encrypt")
	.addItem(rijndael.RijndaelEncryptTransform, "Rijndael", "Rijndael Encrypt")
	.addItem(serpent.SerpentEncryptTransform, "Serpent", "Serpent Encrypt")
	.addItem(shark.SharkEncryptTransform, "SHARK", "SHARK Encrypt")
	.addItem(skipjack.SkipjackEncryptTransform, "Skipjack", "Skipjack Encrypt")
	.addItem(speck.SpeckEncryptTransform, "Speck", "Speck Encrypt")
	.addItem(square.SquareEncryptTransform, "SQUARE", "SQUARE Encrypt")
	.addItem(tea.TeaEncryptTransform, "TEA", "TEA Encrypt")
	.addItem(threefish.ThreefishEncryptTransform, "Threefish", "Threefish Encrypt")
	.addItem(treyfer.TreyferEncryptTransform, "Treyfer", "Treyfer Encrypt")
	.addItem(twofish.TwofishEncryptTransform, "Twofish", "Twofish Encrypt")
	.addItem(xtea.XTeaEncryptTransform, "XTEA", "XTEA Encrypt")
	.addItem(xxtea.XXTeaEncryptTransform, "XXTEA", "XXTEA Encrypt")
	.addItem(nativeRsa.NativeRsaOaepEncryptTransform, "RSA (OAEP)", "RSA (OAEP) Encrypt");
