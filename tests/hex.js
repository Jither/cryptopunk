import test from "ava";
import { testHandlesEmptyString, testHandlesEmptyArray } from "./_testutils";
import { HexToBytesTransform, BytesToHexTransform } from "transforms/hex";
import { TransformError } from "transforms/transforms";

test("Decoder handles empty string gracefully", testHandlesEmptyString, HexToBytesTransform);
test("Encoder handles empty array gracefully", testHandlesEmptyArray, BytesToHexTransform);

test("Decoder throws on invalid characters", t => {
	const tf = new HexToBytesTransform();

	const error = t.throws(() => tf.transform("a bc dQ 01 23"));
	t.true(error instanceof TransformError);
});
