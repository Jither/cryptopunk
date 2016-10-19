import test from "ava";
import { BinaryToBytesTransform, BytesToBinaryTransform } from "transforms/binary";
import { TransformError } from "transforms/transforms";

// Decoding

test("Decodes simple binary", t => {
	const tf = new BinaryToBytesTransform();

	t.deepEqual(tf.transform("1010101111001101"), [0xab, 0xcd]);
});

test("Ignores whitespace by default", t => {
	const tf = new BinaryToBytesTransform();
	
	t.deepEqual(tf.transform(" 1010 101111 0 0110 1 "), [0xab, 0xcd]);
})

test("Decodes leading zeroes", t => {
	const tf = new BinaryToBytesTransform();

	t.deepEqual(tf.transform("00000000 00000001 10101011 11001101"), [0x00, 0x01, 0xab, 0xcd]);
	t.deepEqual(tf.transform("00000000 00000000 00000001 10101011 11001101"), [0x00, 0x00, 0x01, 0xab, 0xcd]);
});

test("Decodes trailing zeroes", t => {
	const tf = new BinaryToBytesTransform();

	t.deepEqual(tf.transform("00000001 10101011 11001101 00000000"), [0x01, 0xab, 0xcd, 0x00]);
	t.deepEqual(tf.transform("00000001 10101011 11001101 00000000 00000000"), [0x01, 0xab, 0xcd, 0x00, 0x00]);
});

test("Decodes non-byte-alignment as missing leading zeroes", t => {
	const tf = new BinaryToBytesTransform();

	t.deepEqual(tf.transform("1 10101011"), [0x01, 0xab]);
	t.deepEqual(tf.transform("1 01010010 10101011"), [0x01, 0x52, 0xab]);
});

test("Decoder handles empty string gracefully", t => {
	const tf = new BinaryToBytesTransform();

	t.deepEqual(tf.transform(""), []);
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