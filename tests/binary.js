import test from "ava";
import { testStringToBytes, testBytesToString, testHandlesEmptyString, testHandlesEmptyArray, prepareTitle } from "./_testutils";
import { BinaryToBytesTransform, BytesToBinaryTransform } from "transforms/binary";
import { TransformError } from "transforms/transforms";

function doTestDecode(title, expectedHex, input)
{
	test(prepareTitle("Binary", title, input), testStringToBytes, BinaryToBytesTransform, expectedHex, input);
}

function doTestEncode(title, expected, inputHex)
{
	test(prepareTitle("Binary", title, inputHex), testBytesToString, BytesToBinaryTransform, expected, inputHex);
}

doTestDecode("decodes simple binary",         "abcd", "1010101111001101");
doTestDecode("ignores whitespace by default", "abcd", " 1010 101111 0 0110 1 ");
doTestDecode("decodes leading zeroes #1",     "0001abcd", "00000000 00000001 10101011 11001101");
doTestDecode("decodes leading zeroes #2",     "000001abcd", "00000000 00000000 00000001 10101011 11001101");
doTestDecode("decodes trailing zeroes #1",    "01abcd00", "00000001 10101011 11001101 00000000");
doTestDecode("decodes trailing zeroes #2",    "01abcd0000", "00000001 10101011 11001101 00000000 00000000");
doTestDecode("decodes non-byte-alignment as missing leading zeroes #1", "01ab", "1 10101011");
doTestDecode("decodes non-byte-alignment as missing leading zeroes #2", "0152ab", "1 01010010 10101011");

test("Decoder handles empty string gracefully", testHandlesEmptyString, BinaryToBytesTransform);

test("Decoder throws on invalid characters", t => {
	const tf = new BinaryToBytesTransform();

	const error = t.throws(() => tf.transform("0101ab01"));
	t.true(error instanceof TransformError);
});

doTestEncode("encodes simple binary",          "10101011 11001101", "abcd");
doTestEncode("encodes leading zero bytes #1",  "00000000 10101011 11001101", "00abcd");
doTestEncode("encodes leading zero bytes #2",  "00000000 00000000 10101011 11001101", "0000abcd");
doTestEncode("encodes trailing zero bytes #1", "10101011 11001101 00000000", "abcd00");
doTestEncode("encodes trailing zero bytes #2", "10101011 11001101 00000000 00000000", "abcd0000");

test("Encoder handles empty array gracefully", testHandlesEmptyArray, BytesToBinaryTransform);
