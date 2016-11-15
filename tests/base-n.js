import test from "ava";
import { testStringToBytes, testBytesToString, testHandlesEmptyString, prepareTitle } from "./_testutils";
import { TransformError } from "transforms/transforms";
import {
	OctalToBytesTransform,
	DecimalToBytesTransform,
	Base32ToBytesTransform, 
	Base32HexToBytesTransform, 
	Base64ToBytesTransform, 
	Base64UrlToBytesTransform,
	BytesToOctalTransform,
	BytesToDecimalTransform,
	BytesToBase32Transform,
	BytesToBase64Transform
} from "transforms/base-n";

test("Base32-HEX decoder handles empty string gracefully", testHandlesEmptyString, Base32HexToBytesTransform);
test("Base32 decoder handles empty string gracefully", testHandlesEmptyString, Base32ToBytesTransform);
test("Base64 decoder handles empty string gracefully", testHandlesEmptyString, Base64ToBytesTransform);
