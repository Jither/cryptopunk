import test from "ava";
import { LuciferEncryptTransform, LuciferDecryptTransform } from "transforms/modern/lucifer";
import { testBytesToBytes } from "../_testutils";
import { hexToBytes } from "cryptopunk.utils";

function doTest(title, expectedHex, messageHex, keyHex, blockSize)
{
	const key = hexToBytes(keyHex);
	test("LUCIFER Encrypts " + title, testBytesToBytes, LuciferEncryptTransform, expectedHex, messageHex, key);
	test("LUCIFER Decrypts " + title, testBytesToBytes, LuciferDecryptTransform, messageHex, expectedHex, key);
}

doTest("Richard Outerbridge test vector #1", "a201fc18d62c85ef5965a58295bbf609", "00000000000000000000000000000000", "0123456789abcdeffedcba9876543210");
doTest("Richard Outerbridge test vector #2", "9d14fe4377aa87dd07cc8a14522c21ed", "0123456789abcdeffedcba9876543210", "00000000000000000000000000000000");
doTest("Richard Outerbridge test vector #3", "97f1c104b0f120d194c07024f14815ed", "ffffffffffffffffffffffffffffffff", "0123456789abcdeffedcba9876543210");
doTest("Richard Outerbridge test vector #4", "d442a34dd70e2b4156eb0f2a8aded1a7", "0123456789abcdeffedcba9876543210", "ffffffffffffffffffffffffffffffff");
doTest("Richard Outerbridge test vector #5", "cf46622fa98546bb9a5bc00239eb0c92", "0123456789abcdeffedcba9876543210", "0123456789abcdeffedcba9876543210");
doTest("Richard Outerbridge test vector #6", "7faf65bfc5458fd2dc9cc2266012ef44", "0123456789abcdeffedcba9876543210", "fedcba98765432100123456789abcdef");
