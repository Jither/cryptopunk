import test from "ava";
import { SkipDecryptTransform, SkipEncryptTransform } from "transforms/classical/skip";
import { TransformError } from "transforms/transforms";

test("Decryption throws when not full coverage", t => {
	const tf = new SkipDecryptTransform();

	// 3 is not coprime with 9 (message length). This means we'd only get ADGADGADG...
	const error = t.throws(() => tf.transform("ABCDEFGHI", { start: 0, skip: 3 }));
	t.true(error instanceof TransformError);
});

test("Decrypt handles empty string gracefully", t => {
	const tf = new SkipDecryptTransform();

	t.is(tf.transform(""), "");
});

test("Encryption throws when not full coverage", t => {
	const tf = new SkipEncryptTransform();

	// 3 is not coprime with 9 (message length). This means we'd only get ADGADGADG...
	const error = t.throws(() => tf.transform("ABCDEFGHI", { start: 0, skip: 3 }));
	t.true(error instanceof TransformError);
});

test("Encrypt handles empty string gracefully", t => {
	const tf = new SkipEncryptTransform();

	t.is(tf.transform(""), "");
});