import test from "ava";
import { testStringToBytes, testBytesToString, testHandlesEmptyString, prepareTitle } from "./_testutils";
import { TransformError } from "transforms/transforms";
import {
	OctalToBytesTransform,
	DecimalToBytesTransform,
	Base32ToBytesTransform, 
	Base32HexToBytesTransform, 
	Base64ToBytesTransform, 
	Base64UrlToBytesTransform,
	BytesToOctalTransform,
	BytesToDecimalTransform,
	BytesToBase32Transform,
	BytesToBase64Transform
} from "transforms/base-n";

function doTest8Decode(title, expectedHex, input)
{
	test(prepareTitle("Octal", title, input), testStringToBytes, OctalToBytesTransform, expectedHex, input);
}

function doTest10Decode(title, expectedHex, input)
{
	test(prepareTitle("Decimal", title, input), testStringToBytes, DecimalToBytesTransform, expectedHex, input);
}

function doTest32Decode(title, expectedHex, input)
{
	test(prepareTitle("Base32", title, input), testStringToBytes, Base32ToBytesTransform, expectedHex, input);
}

function doTest32HexDecode(title, expectedHex, input)
{
	test(prepareTitle("Base32-HEX", title, input), testStringToBytes, Base32HexToBytesTransform, expectedHex, input);
}

function doTest64Decode(title, expectedHex, input)
{
	test(prepareTitle("Base64", title, input), testStringToBytes, Base64ToBytesTransform, expectedHex, input);
}

function doTest64UrlDecode(title, expectedHex, input)
{
	test(prepareTitle("Base64 URL-safe", title, input), testStringToBytes, Base64UrlToBytesTransform, expectedHex, input);
}

function doTest8Encode(title, expected, inputHex)
{
	test(prepareTitle("Octal", title, inputHex), testBytesToString, BytesToOctalTransform, expected, inputHex);
}

function doTest10Encode(title, expected, inputHex)
{
	test(prepareTitle("Decimal", title, inputHex), testBytesToString, BytesToDecimalTransform, expected, inputHex);
}

function doTest32Encode(title, expected, inputHex, ...rest)
{
	test(prepareTitle("Base32", title, inputHex), testBytesToString, BytesToBase32Transform, expected, inputHex, ...rest);
}

function doTest64Encode(title, expected, inputHex, ...rest)
{
	test(prepareTitle("Base64", title, inputHex), testBytesToString, BytesToBase64Transform, expected, inputHex, ...rest);
}

doTest8Decode("decodes {0}", "66", "146");
doTest8Decode("decodes {0}", "666f", "63157");
doTest8Decode("decodes {0}", "666f6f", "31467557");
doTest8Decode("decodes {0}", "666f6f62", "14633667542");
doTest8Decode("decodes {0}", "666f6f6261", "6315733661141");
doTest8Decode("decodes {0}", "666f6f626172", "3146755730460562");

doTest8Decode("discards leading zeroes", "666f6f626172", "0003146755730460562");
doTest8Decode("keeps trailing zeroes", "0a72ee00", "1234567000");


doTest10Decode("decodes {0}", "66", "102");
doTest10Decode("decodes {0}", "666f", "26223");
doTest10Decode("decodes {0}", "666f6f", "6713199");
doTest10Decode("decodes {0}", "666f6f62", "1718579042");
doTest10Decode("decodes {0}", "666f6f6261", "439956234849");
doTest10Decode("decodes {0}", "666f6f626172", "112628796121458");

doTest10Decode("discards leading zeroes", "666f6f626172", "000112628796121458");
doTest10Decode("keeps trailing zeroes", "1cbe991a08", "123456789000");

doTest32Decode("decodes {0}", "66", "MY======");
doTest32Decode("decodes {0}", "666f", "MZXQ====");
doTest32Decode("decodes {0}", "666f6f", "MZXW6===");
doTest32Decode("decodes {0}", "666f6f62", "MZXW6YQ=");
doTest32Decode("decodes {0}", "666f6f6261", "MZXW6YTB");
doTest32Decode("decodes {0}", "666f6f626172", "MZXW6YTBOI======");

doTest32Decode("decodes lowercase {0}", "66", "my======");
doTest32Decode("decodes lowercase {0}", "666f", "mzxq====");
doTest32Decode("decodes lowercase {0}", "666f6f", "mzxw6===");
doTest32Decode("decodes lowercase {0}", "666f6f62", "mzxw6yq=");
doTest32Decode("decodes lowercase {0}", "666f6f6261", "mzxw6ytb");
doTest32Decode("decodes lowercase {0}", "666f6f626172", "mzxw6ytboi======");

doTest32Decode("infers padding on {0}", "66", "MY");
doTest32Decode("infers padding on {0}", "666f", "MZXQ");
doTest32Decode("infers padding on {0}", "666f6f", "MZXW6");
doTest32Decode("infers padding on {0}", "666f6f62", "MZXW6YQ");
doTest32Decode("infers padding on {0}", "666f6f626172", "MZXW6YTBOI");

doTest32HexDecode("decodes {0}", "66", "CO======");
doTest32HexDecode("decodes {0}", "666f", "CPNG====");
doTest32HexDecode("decodes {0}", "666f6f", "CPNMU===");
doTest32HexDecode("decodes {0}", "666f6f62", "CPNMUOG=");
doTest32HexDecode("decodes {0}", "666f6f6261", "CPNMUOJ1");
doTest32HexDecode("decodes {0}", "666f6f626172", "CPNMUOJ1E8======");

doTest32HexDecode("decodes lowercase {0}", "66", "co======");
doTest32HexDecode("decodes lowercase {0}", "666f", "cpng====");
doTest32HexDecode("decodes lowercase {0}", "666f6f", "cpnmu===");
doTest32HexDecode("decodes lowercase {0}", "666f6f62", "cpnmuog=");
doTest32HexDecode("decodes lowercase {0}", "666f6f6261", "cpnmuoj1");
doTest32HexDecode("decodes lowercase {0}", "666f6f626172", "cpnmuoj1e8======");

doTest32HexDecode("infers padding on {0}", "66", "co");
doTest32HexDecode("infers padding on {0}", "666f", "cpng");
doTest32HexDecode("infers padding on {0}", "666f6f", "cpnmu");
doTest32HexDecode("infers padding on {0}", "666f6f62", "cpnmuog");
doTest32HexDecode("infers padding on {0}", "666f6f626172", "cpnmuoj1e8");

test ("Base32-HEX decoder handles empty string gracefully", testHandlesEmptyString, Base32HexToBytesTransform);
test ("Base32 decoder handles empty string gracefully", testHandlesEmptyString, Base32ToBytesTransform);

doTest64Decode("decodes {0}", "66", "Zg==");
doTest64Decode("decodes {0}", "666f", "Zm8=");
doTest64Decode("decodes {0}", "666f6f", "Zm9v");
doTest64Decode("decodes {0}", "666f6f62", "Zm9vYg==");
doTest64Decode("decodes {0}", "666f6f6261", "Zm9vYmE=");
doTest64Decode("decodes {0}", "666f6f626172", "Zm9vYmFy");

doTest64Decode("infers padding on {0}", "66", "Zg");
doTest64Decode("infers padding on {0}", "666f", "Zm8");
doTest64Decode("infers padding on {0}", "666f6f62", "Zm9vYg");
doTest64Decode("infers padding on {0}", "666f6f6261", "Zm9vYmE");

doTest64Decode("keeps zero bytes #1", "0000000000", "AAAAAAA=");
doTest64Decode("keeps zero bytes #2", "00000000000000000000", "AAAAAAAAAAAAAA==");

doTest64Decode("decodes non-alphanumeric chars", "3f3f3f3e3e3e", "Pz8/Pj4+");

doTest64UrlDecode("decodes non-alphanumeric chars", "3f3f3f3e3e3e", "Pz8_Pj4-");

test("Base64 decoder handles empty string gracefully", testHandlesEmptyString, Base64ToBytesTransform);

doTest8Encode("encodes {0}", "146", "66");
doTest8Encode("encodes {0}", "63157", "666f");
doTest8Encode("encodes {0}", "31467557", "666f6f");
doTest8Encode("encodes {0}", "14633667542", "666f6f62");
doTest8Encode("encodes {0}", "6315733661141", "666f6f6261");
doTest8Encode("encodes {0}", "3146755730460562", "666f6f626172");

doTest8Encode("discards leading zero bytes", "3146755730460562", "000000666f6f626172");
doTest8Encode("keeps trailing zero bytes", "1234567000", "0a72ee00");

doTest10Encode("encodes {0}", "102", "66");
doTest10Encode("encodes {0}", "26223", "666f");
doTest10Encode("encodes {0}", "6713199", "666f6f");
doTest10Encode("encodes {0}", "1718579042", "666f6f62");
doTest10Encode("encodes {0}", "439956234849", "666f6f6261");
doTest10Encode("encodes {0}", "112628796121458", "666f6f626172");

doTest10Encode("discards leading zero bytes", "112628796121458", "000000666f6f626172");
doTest10Encode("keeps trailing zero bytes", "31604937984000", "1cbe991a0800");

doTest32Encode("encodes {0}", "my======", "66");
doTest32Encode("encodes {0}", "mzxq====", "666f");
doTest32Encode("encodes {0}", "mzxw6===", "666f6f");
doTest32Encode("encodes {0}", "mzxw6yq=", "666f6f62");
doTest32Encode("encodes {0}", "mzxw6ytb", "666f6f6261");
doTest32Encode("encodes {0}", "mzxw6ytboi======", "666f6f626172");

doTest32Encode("can encode {0} without padding", "my", "66", { pad: false });
doTest32Encode("can encode {0} without padding", "mzxq", "666f", { pad: false });
doTest32Encode("can encode {0} without padding", "mzxw6", "666f6f", { pad: false });
doTest32Encode("can encode {0} without padding", "mzxw6yq", "666f6f62", { pad: false });
doTest32Encode("can encode {0} without padding", "mzxw6ytb", "666f6f6261", { pad: false });
doTest32Encode("can encode {0} without padding", "mzxw6ytboi", "666f6f626172", { pad: false });

doTest64Encode("encodes {0}", "Zg==", "66");
doTest64Encode("encodes {0}", "Zm8=", "666f");
doTest64Encode("encodes {0}", "Zm9v", "666f6f");
doTest64Encode("encodes {0}", "Zm9vYg==", "666f6f62");
doTest64Encode("encodes {0}", "Zm9vYmE=", "666f6f6261");
doTest64Encode("encodes {0}", "Zm9vYmFy", "666f6f626172");

doTest64Encode("can encode {0} without padding", "Zg", "66", { pad: false });
doTest64Encode("can encode {0} without padding", "Zm8", "666f", { pad: false });
doTest64Encode("can encode {0} without padding", "Zm9v", "666f6f", { pad: false });
doTest64Encode("can encode {0} without padding", "Zm9vYg", "666f6f62", { pad: false });
doTest64Encode("can encode {0} without padding", "Zm9vYmE", "666f6f6261", { pad: false });
doTest64Encode("can encode {0} without padding", "Zm9vYmFy", "666f6f626172", { pad: false });

doTest64Encode("encodes zero bytes #1", "AAAAAAA=", "0000000000");
doTest64Encode("encodes zero bytes #2", "AAAAAAAAAAAAAA==", "00000000000000000000");
