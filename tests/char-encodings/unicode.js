import test from "ava";
import { Ucs2ToBytesTransform, BytesToUcs2Transform, Utf8ToBytesTransform, Utf16ToBytesTransform, BytesToUtf16Transform } from "transforms/char-encodings/unicode";
import { testHandlesEmptyString, testHandlesEmptyArray } from "../_testutils";
import { TransformError } from "transforms/transforms";

test("UCS-2 Decoder handles empty string gracefully", testHandlesEmptyString, Ucs2ToBytesTransform);
test("UCS-2 Encoder handles empty array gracefully", testHandlesEmptyArray, BytesToUcs2Transform);
test("UTF-8 Decoder handles empty string gracefully", testHandlesEmptyString, Utf8ToBytesTransform);
test("UTF-16 Decoder handles empty string gracefully", testHandlesEmptyString, Utf16ToBytesTransform);
test("UTF-16 Decoder handles empty array gracefully", testHandlesEmptyArray, BytesToUtf16Transform);
