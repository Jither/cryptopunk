import test from "ava";
import { VigenereEncryptTransform, VigenereDecryptTransform } from "transforms/classical/vigenere";
import { TransformError } from "transforms/transforms";

test("Encrypt handles empty string gracefully", t => {
	const tf = new VigenereEncryptTransform();

	t.is(tf.transform("", "password"), "");
});

test("Decrypt handles empty string gracefully", t => {
	const tf = new VigenereDecryptTransform();

	t.is(tf.transform("", "password"), "");
});

test("Encrypt throws on missing key", t => {
	const tf = new VigenereEncryptTransform();

	const error = t.throws(() => tf.transform("test"));
	t.true(error instanceof TransformError);
});

test("Decrypt throws on missing key", t => {
	const tf = new VigenereDecryptTransform();

	const error = t.throws(() => tf.transform("test"));
	t.true(error instanceof TransformError);
});

test("Encrypt throws on non-alphabet character in key", t => {
	const tf = new VigenereEncryptTransform();

	const error = t.throws(() => tf.transform("test", "nøgle"));
	t.true(error instanceof TransformError);
});

test("Decrypt throws on non-alphabet character in key", t => {
	const tf = new VigenereDecryptTransform();

	const error = t.throws(() => tf.transform("test", "nøgle"));
	t.true(error instanceof TransformError);
});
