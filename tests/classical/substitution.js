import test from "ava";
import { SimpleSubstitutionTransform } from "transforms/classical/simple-substitution";
import { TransformError } from "transforms/transforms";

test("Handles empty string gracefully", t => {
	const tf = new SimpleSubstitutionTransform();

	t.is(tf.transform(""), "");
});