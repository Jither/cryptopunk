import test from "ava";
import { VigenereEncryptTransform, VigenereDecryptTransform } from "transforms/classical/vigenere";
import { TransformError } from "transforms/transforms";

test("Encrypts Vigenere", t => {
	const tf = new VigenereEncryptTransform();
	
	t.is(tf.transform("The Quick Brown Fox Jumps Over Lazy Dogs", "password"), "Ihw Iqwtn Qrgoj Tfa Yueho Cmhg Lsru Rfjh");
});

test("Decrypts Vigenere", t => {
	const tf = new VigenereDecryptTransform();

	t.is(tf.transform("Ihw Iqwtn Qrgoj Tfa Yueho Cmhg Lsru Rfjh", "password"), "The Quick Brown Fox Jumps Over Lazy Dogs");
});

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

test("Decrypt handles empty string gracefully", t => {
	const tf = new VigenereDecryptTransform();

	const error = t.throws(() => tf.transform("test"));
	t.true(error instanceof TransformError);
});