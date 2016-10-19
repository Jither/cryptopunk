import test from "ava";
import { RotXTransform, Rot47Transform } from "transforms/rotx";
import { TransformError } from "transforms/transforms";

test("Transforms simple ROT-13 (by default)", t => {
	const tf = new RotXTransform();
	
	t.is(tf.transform("Why did the chicken cross the road? Gb trg gb gur bgure fvqr!"), "Jul qvq gur puvpxra pebff gur ebnq? To get to the other side!");
});

test("Transforms ROT-47 (by default)", t => {
	const tf = new Rot47Transform();

	t.is(tf.transform("The Quick Brown Fox Jumps Over The Lazy Dog."), '%96 "F:4< qC@H? u@I yF>AD ~G6C %96 {2KJ s@8]');
});

test("Encrypts with other values for x", t => {
	const tf = new RotXTransform();

	t.is(tf.transform("ABCxyz", { x: 3 }), "DEFabc");
});

test("Decrypts with other values for x", t => {
	const tf = new RotXTransform();

	t.is(tf.transform("DEFabc", { x: 3, decrypt: true }), "ABCxyz");
});

test("Decrypts with x > alphabet size", t => {
	const tf = new RotXTransform();

	t.is(tf.transform("ABCxyz", { x: 3 }), "DEFabc");
});

test("Encrypts with x > alphabet size", t => {
	const tf = new RotXTransform();

	t.is(tf.transform("DEFabc", { x: 29, decrypt: true }), "ABCxyz");
});

test("Handles empty string gracefully", t => {
	const tf = new RotXTransform();

	t.is(tf.transform(""), "");
});