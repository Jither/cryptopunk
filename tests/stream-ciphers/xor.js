import test from "ava";
import { testBytesToBytes } from "../_testutils";
import { hexToBytes } from "cryptopunk.utils";
import { XorTransform } from "transforms/stream-ciphers/xor";

function doTest(title, expectedHex, inputHex, keyHex, repeatKey)
{
	const keyBytes = hexToBytes(keyHex);
	test("XOR encrypts " + title, testBytesToBytes, XorTransform, expectedHex, inputHex, keyBytes, { repeatKey: repeatKey });
}

doTest("without key, repeating",        "0123456789abcdef", "0123456789abcdef", "", true);
doTest("without key, non-repeating",    "0123456789abcdef", "0123456789abcdef", "", false);
doTest("with short key, repeating",     "ab89efcd23016745", "0123456789abcdef", "aa", true);
doTest("with short key, non-repeating", "ab23456789abcdef", "0123456789abcdef", "aa", false);
doTest("with long key, repeating",      "ab9889ba6754cdfe", "0123456789abcdef", "aabbccddeeff0011223344", true);
doTest("with long key, non-repeating",  "ab9889ba6754cdfe", "0123456789abcdef", "aabbccddeeff0011223344", false);
