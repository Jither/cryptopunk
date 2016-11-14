import test from "ava";
import { testStringToBytes, testBytesToString, testHandlesEmptyString, testHandlesEmptyArray } from "../_testutils";
import { AsciiToBytesTransform, BytesToAsciiTransform } from "transforms/char-encodings/ascii";
import { TransformError } from "transforms/transforms";

test("Decodes simple ASCII", testStringToBytes, AsciiToBytesTransform, "61626341424378797a313233212540", "abcABCxyz123!%@");
test("Decodes control codes", testStringToBytes, AsciiToBytesTransform, "090d0a011f", "\t\r\n\x01\x1f");
test("Decoder handles empty string gracefully", testHandlesEmptyString, AsciiToBytesTransform);

test("Decoder throws on invalid ASCII", t => {
	const tf = new AsciiToBytesTransform();

	const error = t.throws(() => tf.transform("\x80\xff"));
	t.true(error instanceof TransformError);
})

test("Encodes simple ASCII", testBytesToString, BytesToAsciiTransform, "abcABCxyz123!%@", "61626341424378797a313233212540");
test("Encoder skips uncommon control codes", testBytesToString, BytesToAsciiTransform, "\t\r\n", "090d011f0a");
test("Encoder handles empty array gracefully", testHandlesEmptyArray, BytesToAsciiTransform);
