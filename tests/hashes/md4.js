import test from "ava";
import { testAsciiHash } from "../_testutils";
import { Md4Transform } from "transforms/hashes/md4";

test("Hashes RFC 1320 test vector #1", testAsciiHash, Md4Transform, "31d6cfe0d16ae931b73c59d7e0c089c0", "");
test("Hashes RFC 1320 test vector #2", testAsciiHash, Md4Transform, "bde52cb31de33e46245e05fbdbd6fb24", "a");
test("Hashes RFC 1320 test vector #3", testAsciiHash, Md4Transform, "a448017aaf21d8525fc10ae87aa6729d", "abc");
test("Hashes RFC 1320 test vector #4", testAsciiHash, Md4Transform, "d9130a8164549fe818874806e1c7014b", "message digest");
test("Hashes RFC 1320 test vector #5", testAsciiHash, Md4Transform, "d79e1c308aa5bbcdeea8ed63df412da9", "abcdefghijklmnopqrstuvwxyz");
test("Hashes RFC 1320 test vector #6", testAsciiHash, Md4Transform, "043f8582f241db351ce627e153e7f0e4", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
test("Hashes RFC 1320 test vector #7", testAsciiHash, Md4Transform, "e33b4ddc9c38f2199c3e7b164fcc0536", "12345678901234567890123456789012345678901234567890123456789012345678901234567890");

test("Hashes exactly 448 bits correctly", testAsciiHash, Md4Transform, "cce4257176f515fb56d35a4a5cbf8832", "01234567890123456789012345678901234567890123456789012345");
test("Hashes exactly 512 bits correctly", testAsciiHash, Md4Transform, "1d7851638dce5712dda85dec7cdaa0bc", "0123456789012345678901234567890123456789012345678901234567890123");
