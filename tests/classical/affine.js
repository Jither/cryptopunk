import test from "ava";
import { AffineEncryptTransform, AffineDecryptTransform } from "transforms/classical/affine";
import { TransformError } from "transforms/transforms";

test("Encryption throws for bad a", t => {
	const tf = new AffineEncryptTransform();

	// 13 is not coprime with 26 (gcd 13)
	let error = t.throws(() => tf.transform("Anything goes", null, { a: 13 }));
	t.true(error instanceof TransformError);

	// 4 is not coprime with 26 (gcd 2)
	error = t.throws(() => tf.transform("Anything goes", null, { a: 4 }));
	t.true(error instanceof TransformError);
})

test("Decryption throws for bad a", t => {
	const tf = new AffineDecryptTransform();

	// 13 is not coprime with 26 (gcd 13)
	let error = t.throws(() => tf.transform("Anything goes", null, { a: 13 }));
	t.true(error instanceof TransformError);

	// 4 is not coprime with 26 (gcd 2)
	error = t.throws(() => tf.transform("Anything goes", null, { a: 4 }));
	t.true(error instanceof TransformError);
})

test("Encryption handles empty string gracefully", t => {
	const tf = new AffineEncryptTransform();

	t.is(tf.transform(""), "");
});

test("Decryption handles empty string gracefully", t => {
	const tf = new AffineDecryptTransform();

	t.is(tf.transform(""), "");
});