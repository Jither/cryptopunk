import test from "ava";
import { Rot47Transform, RotXEncryptTransform, RotXDecryptTransform } from "transforms/classical/rotx";
import { TransformError } from "transforms/transforms";

test("Encrypt handles empty string gracefully", t => {
	const tf = new RotXEncryptTransform();

	t.is(tf.transform(""), "");
});

test("Decrypt handles empty string gracefully", t => {
	const tf = new RotXDecryptTransform();

	t.is(tf.transform(""), "");
});