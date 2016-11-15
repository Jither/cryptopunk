import test from "ava";
import { testHandlesEmptyString, testHandlesEmptyArray } from "./_testutils";
import { BinaryToBytesTransform, BytesToBinaryTransform } from "transforms/binary";
import { TransformError } from "transforms/transforms";

test("Decoder handles empty string gracefully", testHandlesEmptyString, BinaryToBytesTransform);
test("Encoder handles empty array gracefully", testHandlesEmptyArray, BytesToBinaryTransform);

test("Decoder throws on invalid characters", t => {
	const tf = new BinaryToBytesTransform();

	const error = t.throws(() => tf.transform("0101ab01"));
	t.true(error instanceof TransformError);
});
