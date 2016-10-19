import test from "ava";
import { hexToBytes } from "cryptopunk.utils";
import { HexToBytesTransform, BytesToHexTransform } from "transforms/hex";
import { TransformError } from "transforms/transforms";

// Decoding

test("Decodes simple hex", t => {
	const tf = new HexToBytesTransform();

	t.deepEqual(tf.transform("abcd"), hexToBytes("abcd"));
});

test("Decodes uppercase", t => {
	const tf = new HexToBytesTransform();

	t.deepEqual(tf.transform("01ABCD"), hexToBytes("01abcd"));
});

test("Ignores whitespace by default", t => {
	const tf = new HexToBytesTransform();
	
	t.deepEqual(tf.transform("0 001 abc d"), hexToBytes("0001abcd"));
})

test("Decodes leading zeroes", t => {
	const tf = new HexToBytesTransform();

	t.deepEqual(tf.transform("00 01 ab cd"), hexToBytes("0001abcd"));
	t.deepEqual(tf.transform("00 00 01 ab cd"), hexToBytes("000001abcd"));
});

test("Decodes trailing zeroes", t => {
	const tf = new HexToBytesTransform();

	t.deepEqual(tf.transform("01 ab cd 00"), hexToBytes("01abcd00"));
	t.deepEqual(tf.transform("01 ab cd 00 00"), hexToBytes("01abcd0000"));
});

test("Decodes non-byte-alignment as missing leading zero", t => {
	const tf = new HexToBytesTransform();

	t.deepEqual(tf.transform("1 ab"), hexToBytes("01ab"));
	t.deepEqual(tf.transform("1 52 ab"), hexToBytes("0152ab"));
});

test("Decoder handles empty string gracefully", t => {
	const tf = new HexToBytesTransform();

	const actual = tf.transform("");
	t.true(actual instanceof Uint8Array);
	t.is(actual.length, 0);
});

test("Decoder throws on invalid characters", t => {
	const tf = new HexToBytesTransform();

	const error = t.throws(() => tf.transform("a bc dQ 01 23"));
	t.true(error instanceof TransformError);
});

// Encoding

test("Encodes simple hex", t => {
	const tf = new BytesToHexTransform();

	t.is(tf.transform([0xab, 0xcd]), "ab cd");
});

test("Encodes leading zero bytes", t => {
	const tf = new BytesToHexTransform();

	t.is(tf.transform([0x00, 0xab, 0xcd]), "00 ab cd");
	t.is(tf.transform([0x00, 0x00, 0xab, 0xcd]), "00 00 ab cd");
});

test("Encodes trailing zero bytes", t => {
	const tf = new BytesToHexTransform();

	t.is(tf.transform([0xab, 0xcd, 0x00]), "ab cd 00");
	t.is(tf.transform([0xab, 0xcd, 0x00, 0x00]), "ab cd 00 00");
});

test("Encoder handles empty array gracefully", t => {
	const tf = new BytesToHexTransform();

	t.is(tf.transform([]), "");
});