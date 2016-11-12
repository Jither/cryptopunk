import test from "ava";
import { AffineEncryptTransform, AffineDecryptTransform } from "transforms/classical/affine";
import { TransformError } from "transforms/transforms";

test("Encrypts Affine cipher (default)", t => {
	const tf = new AffineEncryptTransform();
	
	t.is(tf.transform("one flew over the cuckoo's nest"), "zub gkbn zibo yqb rdrfzz't ubty");
});

test("Decrypts Affine cipher (default)", t => {
	const tf = new AffineDecryptTransform();

	t.is(tf.transform("zub gkbn zibo yqb rdrfzz't ubty"), "one flew over the cuckoo's nest");
});

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

test("Encryption handles mixed case", t => {
	const tf = new AffineEncryptTransform();

	t.is(tf.transform("One Flew Over the Cuckoo's Nest"), "Zub Gkbn Zibo yqb Rdrfzz't Ubty");
});

test("Decryption handles mixed case", t => {
	const tf = new AffineDecryptTransform();

	t.is(tf.transform("Zub Gkbn Zibo yqb Rdrfzz't Ubty"), "One Flew Over the Cuckoo's Nest");
});

test("Encryption handles empty string gracefully", t => {
	const tf = new AffineEncryptTransform();

	t.is(tf.transform(""), "");
});

test("Decryption handles empty string gracefully", t => {
	const tf = new AffineDecryptTransform();

	t.is(tf.transform(""), "");
});