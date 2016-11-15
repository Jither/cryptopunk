import test from "ava";
import { testHandlesEmptyString } from "./_testutils";
import { TransformError } from "transforms/transforms";
import { Base32ToBytesTransform, Base32HexToBytesTransform, Base64ToBytesTransform } from "transforms/base-n";

test("Base32-HEX decoder handles empty string gracefully", testHandlesEmptyString, Base32HexToBytesTransform);
test("Base32 decoder handles empty string gracefully", testHandlesEmptyString, Base32ToBytesTransform);
test("Base64 decoder handles empty string gracefully", testHandlesEmptyString, Base64ToBytesTransform);
