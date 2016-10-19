import test from "ava";
import { testStringToBytes, testBytesToString } from "./_testutils";
import { BinaryToBytesTransform, BytesToBinaryTransform } from "transforms/binary";
import { TransformError } from "transforms/transforms";

// Decoding

test("Decodes simple binary", testStringToBytes, BinaryToBytesTransform, "abcd", "1010101111001101");
test("Ignores whitespace by default", testStringToBytes, BinaryToBytesTransform, "abcd", " 1010 101111 0 0110 1 ");
test("Decodes leading zeroes #1", testStringToBytes, BinaryToBytesTransform, "0001abcd", "00000000 00000001 10101011 11001101");
test("Decodes leading zeroes #2", testStringToBytes, BinaryToBytesTransform, "000001abcd", "00000000 00000000 00000001 10101011 11001101");
test("Decodes trailing zeroes #1", testStringToBytes, BinaryToBytesTransform, "01abcd00", "00000001 10101011 11001101 00000000");
test("Decodes trailing zeroes #2", testStringToBytes, BinaryToBytesTransform, "01abcd0000", "00000001 10101011 11001101 00000000 00000000");
test("Decodes non-byte-alignment as missing leading zeroes #1", testStringToBytes, BinaryToBytesTransform, "01ab", "1 10101011");
test("Decodes non-byte-alignment as missing leading zeroes #2", testStringToBytes, BinaryToBytesTransform, "0152ab", "1 01010010 10101011");

test("Decoder handles empty string gracefully", t => {
	const tf = new BinaryToBytesTransform();

	const actual = tf.transform("");
	t.true(actual instanceof Uint8Array);
	t.is(actual.length, 0);
});

test("Decoder throws on invalid characters", t => {
	const tf = new BinaryToBytesTransform();

	const error = t.throws(() => tf.transform("0101ab01"));
	t.true(error instanceof TransformError);
});

// Encoding

test("Encodes simple binary", testBytesToString, BytesToBinaryTransform, "10101011 11001101", "abcd");
test("Encodes leading zero bytes #1", testBytesToString, BytesToBinaryTransform, "00000000 10101011 11001101", "00abcd");
test("Encodes leading zero bytes #2", testBytesToString, BytesToBinaryTransform, "00000000 00000000 10101011 11001101", "0000abcd");
test("Encodes trailing zero bytes #1", testBytesToString, BytesToBinaryTransform, "10101011 11001101 00000000", "abcd00");
test("Encodes trailing zero bytes #2", testBytesToString, BytesToBinaryTransform, "10101011 11001101 00000000 00000000", "abcd0000");

test("Encoder handles empty array gracefully", t => {
	const tf = new BytesToBinaryTransform();

	t.is(tf.transform([]), "");
});