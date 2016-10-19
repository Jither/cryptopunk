import test from "ava";
import { testBytesToString, testStringToBytes, testHandlesEmptyString, testHandlesEmptyArray } from "./_testutils";
import { HexToBytesTransform, BytesToHexTransform } from "transforms/hex";
import { TransformError } from "transforms/transforms";

// Decoding

test("Decodes simple hex", testStringToBytes, HexToBytesTransform, "abcd", "abcd");
test("Decodes uppercase", testStringToBytes, HexToBytesTransform, "01abcd", "01ABCD");
test("Ignores whitespace by default", testStringToBytes, HexToBytesTransform, "0001abcd", "0 001 abc d");
test("Decodes leading zeroes #1", testStringToBytes, HexToBytesTransform, "0001abcd", "00 01 ab cd");
test("Decodes leading zeroes #2", testStringToBytes, HexToBytesTransform, "000001abcd", "00 00 01 ab cd");
test("Decodes trailing zeroes #1", testStringToBytes, HexToBytesTransform, "01abcd00", "01 ab cd 00");
test("Decodes trailing zeroes #2", testStringToBytes, HexToBytesTransform, "01abcd0000", "01 ab cd 00 00");
test("Decodes non-byte-alignment as missing leading zero #1", testStringToBytes, HexToBytesTransform, "01ab", "1 ab");
test("Decodes non-byte-alignment as missing leading zero #2", testStringToBytes, HexToBytesTransform, "0152ab", "1 52 ab");

test("Decoder handles empty string gracefully", testHandlesEmptyString, HexToBytesTransform);

test("Decoder throws on invalid characters", t => {
	const tf = new HexToBytesTransform();

	const error = t.throws(() => tf.transform("a bc dQ 01 23"));
	t.true(error instanceof TransformError);
});

// Encoding

test("Encodes simple hex", testBytesToString, BytesToHexTransform, "ab cd", "abcd");
test("Encodes leading zero bytes #1", testBytesToString, BytesToHexTransform, "00 ab cd", "00abcd");
test("Encodes leading zero bytes #2", testBytesToString, BytesToHexTransform, "00 00 ab cd", "0000abcd");
test("Encodes trailing zero bytes #1", testBytesToString, BytesToHexTransform, "ab cd 00", "abcd00");
test("Encodes trailing zero bytes #2", testBytesToString, BytesToHexTransform, "ab cd 00 00", "abcd0000");

test("Encoder handles empty array gracefully", testHandlesEmptyArray, BytesToHexTransform);
