import test from "ava";
import { testBytesToString, testStringToBytes, testHandlesEmptyString, testHandlesEmptyArray, prepareTitle } from "./_testutils";
import { HexToBytesTransform, BytesToHexTransform } from "transforms/hex";
import { TransformError } from "transforms/transforms";

function doTestDecode(title, expectedHex, input)
{
	test(prepareTitle("Hex", title, input), testStringToBytes, HexToBytesTransform, expectedHex, input);
}

function doTestEncode(title, expected, inputHex)
{
	test(prepareTitle("Hex", title, inputHex), testBytesToString, BytesToHexTransform, expected, inputHex);
}

doTestDecode("decodes simple hex", "abcd", "abcd");
doTestDecode("decodes uppercase", "01abcd", "01ABCD");
doTestDecode("ignores whitespace by default", "0001abcd", "0 001 abc d");
doTestDecode("decodes leading zeroes #1", "0001abcd", "00 01 ab cd");
doTestDecode("decodes leading zeroes #2", "000001abcd", "00 00 01 ab cd");
doTestDecode("decodes trailing zeroes #1", "01abcd00", "01 ab cd 00");
doTestDecode("decodes trailing zeroes #2", "01abcd0000", "01 ab cd 00 00");
doTestDecode("decodes non-byte-alignment as missing leading zero #1", "01ab", "1 ab");
doTestDecode("decodes non-byte-alignment as missing leading zero #2", "0152ab", "1 52 ab");

test("Decoder handles empty string gracefully", testHandlesEmptyString, HexToBytesTransform);

test("Decoder throws on invalid characters", t => {
	const tf = new HexToBytesTransform();

	const error = t.throws(() => tf.transform("a bc dQ 01 23"));
	t.true(error instanceof TransformError);
});

// Encoding

doTestEncode("encodes simple hex", "ab cd", "abcd");
doTestEncode("encodes leading zero bytes #1", "00 ab cd", "00abcd");
doTestEncode("encodes leading zero bytes #2", "00 00 ab cd", "0000abcd");
doTestEncode("encodes trailing zero bytes #1", "ab cd 00", "abcd00");
doTestEncode("encodes trailing zero bytes #2", "ab cd 00 00", "abcd0000");

test("Encoder handles empty array gracefully", testHandlesEmptyArray, BytesToHexTransform);
