import test from "ava";
import { testStringToBytes, testBytesToString, testHandlesEmptyString, testHandlesEmptyArray } from "../_testutils";
import { AsciiToBytesTransform, BytesToAsciiTransform } from "transforms/char-encodings/ascii";
import { TransformError } from "transforms/transforms";

test("Decoder handles empty string gracefully", testHandlesEmptyString, AsciiToBytesTransform);
test("Encoder handles empty array gracefully", testHandlesEmptyArray, BytesToAsciiTransform);

test("Decoder throws on invalid ASCII", t => {
	const tf = new AsciiToBytesTransform();

	const error = t.throws(() => tf.transform("\x80\xff"));
	t.true(error instanceof TransformError);
});
