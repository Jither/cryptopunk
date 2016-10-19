import test from "ava";
import { AsciiToBytesTransform, BytesToAsciiTransform } from "transforms/ascii";
import { TransformError } from "transforms/transforms";

test("Decodes simple ASCII", t => {
	const tf = new AsciiToBytesTransform();
	
	t.deepEqual(tf.transform("abcABCxyz123!%@"), [0x61, 0x62, 0x63, 0x41, 0x42, 0x43, 0x78, 0x79, 0x7a, 0x31, 0x32, 0x33, 0x21, 0x25, 0x40]);
});

test("Decodes control codes", t => {
	const tf = new AsciiToBytesTransform();

	t.deepEqual(tf.transform("\t\r\n\x01\x1f"), [0x09, 0x0d, 0x0a, 0x01, 0x1f]);
})

test("Decoder throws on invalid ASCII", t => {
	const tf = new AsciiToBytesTransform();

	const error = t.throws(() => tf.transform("\x80\xff"));
	t.true(error instanceof TransformError);
})

test("Encodes simple ASCII", t => {
	const tf = new BytesToAsciiTransform();

	t.is(tf.transform([0x61, 0x62, 0x63, 0x41, 0x42, 0x43, 0x78, 0x79, 0x7a, 0x31, 0x32, 0x33, 0x21, 0x25, 0x40]), "abcABCxyz123!%@");
});

test("Encoder skips uncommon control codes", t => {
	const tf = new BytesToAsciiTransform();

	t.is(tf.transform([0x09, 0x0d, 0x01, 0x1f, 0x0a]), "\t\r\n");
});

