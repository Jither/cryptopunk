import test from "ava";
import { RotXTransform, Rot47Transform } from "transforms/classical/rotx";
import { TransformError } from "transforms/transforms";

test("Handles empty string gracefully", t => {
	const tf = new RotXTransform();

	t.is(tf.transform(""), "");
});