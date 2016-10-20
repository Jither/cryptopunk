import test from "ava";
import { testAsciiHash } from "../_testutils";
import { Md2Transform } from "transforms/hashes/md2";

function doTest(title, expectedHex, input)
{
	test("MD2 hashes " + title, testAsciiHash, Md2Transform, expectedHex, input);
}

doTest("RFC 1319 test vector #1", "8350e5a3e24c153df2275c9f80692773", "");
doTest("RFC 1319 test vector #2", "32ec01ec4a6dac72c0ab96fb34c0b5d1", "a");
doTest("RFC 1319 test vector #3", "da853b0d3f88d99b30283a69e6ded6bb", "abc");
doTest("RFC 1319 test vector #4", "ab4f496bfb2a530b219ff33031fe06b0", "message digest");
doTest("RFC 1319 test vector #5", "4e8ddff3650292ab5a4108c3aa47940b", "abcdefghijklmnopqrstuvwxyz");
doTest("RFC 1319 test vector #6", "da33def2a42df13975352846c30338cd", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest("RFC 1319 test vector #7", "d5976f79d83d3a0dc9806c3c66f3efd8", "12345678901234567890123456789012345678901234567890123456789012345678901234567890");
