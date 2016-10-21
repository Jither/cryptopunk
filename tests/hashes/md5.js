import test from "ava";
import { testAsciiHash } from "../_testutils";
import { Md5Transform } from "transforms/hashes/md5";

function doTest(title, expectedHex, input)
{
	test("MD5 hashes " + title, testAsciiHash, Md5Transform, expectedHex, input);
}

doTest("RFC 1321 test vector #1"   , "d41d8cd98f00b204e9800998ecf8427e", "");
doTest("RFC 1321 test vector #2"   , "0cc175b9c0f1b6a831c399e269772661", "a");
doTest("RFC 1321 test vector #3"   , "900150983cd24fb0d6963f7d28e17f72", "abc");
doTest("RFC 1321 test vector #4"   , "f96b697d7cb7938d525a2f31aaf161d0", "message digest");
doTest("RFC 1321 test vector #5"   , "c3fcd3d76192e4007dfb496cca67e13b", "abcdefghijklmnopqrstuvwxyz");
doTest("RFC 1321 test vector #6"   , "d174ab98d277d9f5a5611c2c9f419d9f", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest("RFC 1321 test vector #7"   , "57edf4a22be3c955ac49da2e2107b67a", "1234567890".repeat(8));

doTest("exactly 448 bits correctly", "8af270b2847610e742b0791b53648c09", "01234567890123456789012345678901234567890123456789012345");
doTest("exactly 512 bits correctly", "7f7bfd348709deeaace19e3f535f8c54", "0123456789012345678901234567890123456789012345678901234567890123");
