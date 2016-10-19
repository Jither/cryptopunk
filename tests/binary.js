import test from "ava";
import { hexToBytes } from "cryptopunk.utils";
import { BinaryToBytesTransform, BytesToBinaryTransform } from "transforms/binary";
import { TransformError } from "transforms/transforms";

// Decoding

test("Decodes simple binary", t => {
	const tf = new BinaryToBytesTransform();

	t.deepEqual(tf.transform("1010101111001101"), hexToBytes("abcd"));
});

test("Ignores whitespace by default", t => {
	const tf = new BinaryToBytesTransform();
	
	t.deepEqual(tf.transform(" 1010 101111 0 0110 1 "), hexToBytes("abcd"));
})

test("Decodes leading zeroes", t => {
	const tf = new BinaryToBytesTransform();

	t.deepEqual(tf.transform("00000000 00000001 10101011 11001101"), hexToBytes("0001abcd"));
	t.deepEqual(tf.transform("00000000 00000000 00000001 10101011 11001101"), hexToBytes("000001abcd"));
});

test("Decodes trailing zeroes", t => {
	const tf = new BinaryToBytesTransform();

	t.deepEqual(tf.transform("00000001 10101011 11001101 00000000"), hexToBytes("01abcd00"));
	t.deepEqual(tf.transform("00000001 10101011 11001101 00000000 00000000"), hexToBytes("01abcd0000"));
});

test("Decodes non-byte-alignment as missing leading zeroes", t => {
	const tf = new BinaryToBytesTransform();

	t.deepEqual(tf.transform("1 10101011"), hexToBytes("01ab"));
	t.deepEqual(tf.transform("1 01010010 10101011"), hexToBytes("0152ab"));
});

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

test("Encodes simple binary", t => {
	const tf = new BytesToBinaryTransform();

	t.is(tf.transform([0xab, 0xcd]), "10101011 11001101");
});

test("Encodes leading zero bytes", t => {
	const tf = new BytesToBinaryTransform();

	t.is(tf.transform([0x00, 0xab, 0xcd]), "00000000 10101011 11001101");
	t.is(tf.transform([0x00, 0x00, 0xab, 0xcd]), "00000000 00000000 10101011 11001101");
});

test("Encodes trailing zero bytes", t => {
	const tf = new BytesToBinaryTransform();

	t.is(tf.transform([0xab, 0xcd, 0x00]), "10101011 11001101 00000000");
	t.is(tf.transform([0xab, 0xcd, 0x00, 0x00]), "10101011 11001101 00000000 00000000");
});

test("Encoder handles empty array gracefully", t => {
	const tf = new BytesToBinaryTransform();

	t.is(tf.transform([]), "");
});