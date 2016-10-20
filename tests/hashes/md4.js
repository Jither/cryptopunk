import test from "ava";
import { testAsciiHash } from "../_testutils";
import { Md4Transform } from "transforms/hashes/md4";

function doTest(title, expectedHex, input)
{
	test("MD4 hashes " + title, testAsciiHash, Md4Transform, expectedHex, input);
}

doTest("RFC 1320 test vector #1"   , "31d6cfe0d16ae931b73c59d7e0c089c0", "");
doTest("RFC 1320 test vector #2"   , "bde52cb31de33e46245e05fbdbd6fb24", "a");
doTest("RFC 1320 test vector #3"   , "a448017aaf21d8525fc10ae87aa6729d", "abc");
doTest("RFC 1320 test vector #4"   , "d9130a8164549fe818874806e1c7014b", "message digest");
doTest("RFC 1320 test vector #5"   , "d79e1c308aa5bbcdeea8ed63df412da9", "abcdefghijklmnopqrstuvwxyz");
doTest("RFC 1320 test vector #6"   , "043f8582f241db351ce627e153e7f0e4", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest("RFC 1320 test vector #7"   , "e33b4ddc9c38f2199c3e7b164fcc0536", "12345678901234567890123456789012345678901234567890123456789012345678901234567890");

doTest("exactly 448 bits correctly", "cce4257176f515fb56d35a4a5cbf8832", "01234567890123456789012345678901234567890123456789012345");
doTest("exactly 512 bits correctly", "1d7851638dce5712dda85dec7cdaa0bc", "0123456789012345678901234567890123456789012345678901234567890123");
