import test from "ava";
import { testAsciiHash } from "../_testutils";
import { Md5Transform } from "transforms/hashes/md5";

test("Hashes RFC 1321 test vector #1", testAsciiHash, Md5Transform, "d41d8cd98f00b204e9800998ecf8427e", "");
test("Hashes RFC 1321 test vector #2", testAsciiHash, Md5Transform, "0cc175b9c0f1b6a831c399e269772661", "a");
test("Hashes RFC 1321 test vector #3", testAsciiHash, Md5Transform, "900150983cd24fb0d6963f7d28e17f72", "abc");
test("Hashes RFC 1321 test vector #4", testAsciiHash, Md5Transform, "f96b697d7cb7938d525a2f31aaf161d0", "message digest");
test("Hashes RFC 1321 test vector #5", testAsciiHash, Md5Transform, "c3fcd3d76192e4007dfb496cca67e13b", "abcdefghijklmnopqrstuvwxyz");
test("Hashes RFC 1321 test vector #6", testAsciiHash, Md5Transform, "d174ab98d277d9f5a5611c2c9f419d9f", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
test("Hashes RFC 1321 test vector #7", testAsciiHash, Md5Transform, "57edf4a22be3c955ac49da2e2107b67a", "12345678901234567890123456789012345678901234567890123456789012345678901234567890");

test("Hashes exactly 448 bits correctly", testAsciiHash, Md5Transform, "8af270b2847610e742b0791b53648c09", "01234567890123456789012345678901234567890123456789012345");
test("Hashes exactly 512 bits correctly", testAsciiHash, Md5Transform, "7f7bfd348709deeaace19e3f535f8c54", "0123456789012345678901234567890123456789012345678901234567890123");
