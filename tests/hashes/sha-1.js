import test from "ava";
import { testAsciiHash } from "../_testutils";
import { Sha0Transform, Sha1Transform } from "transforms/hashes/sha-1";

function doTest0(title, expectedHex, input)
{
	test("SHA-0 hashes " + title, testAsciiHash, Sha0Transform, expectedHex, input);
}

function doTest1(title, expectedHex, input)
{
	test("SHA-1 hashes " + title, testAsciiHash, Sha1Transform, expectedHex, input);
}

doTest0("libmd test vector #1" , "f96cea198ad1dd5617ac084a3d92c6107708c0ef", "");
doTest0("libmd test vector #2" , "0164b8a914cd2a5e74c4f7ff082c4d97f1edf880", "abc");
doTest0("libmd test vector #3" , "c1b0f222d150ebb9aa36a40cafdc8bcbed830b14", "message digest");
doTest0("libmd test vector #4" , "b40ce07a430cfd3c033039b9fe9afec95dc1bdcd", "abcdefghijklmnopqrstuvwxyz");
doTest0("libmd test vector #5" , "79e966f7a3a990df33e40e3d7f8f18d2caebadfa", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest0("libmd test vector #6" , "4aa29d14d171522ece47bee8957e35a41f3e9cff", "1234567890".repeat(8));

doTest1("NESSIE test vector #0", "da39a3ee5e6b4b0d3255bfef95601890afd80709", "");
doTest1("NESSIE test vector #1", "86f7e437faa5a7fce15d1ddcb9eaeaea377667b8", "a");
doTest1("NESSIE test vector #2", "a9993e364706816aba3e25717850c26c9cd0d89d", "abc");
doTest1("NESSIE test vector #3", "c12252ceda8be8994d5fa0290a47231c1d16aae3", "message digest");
doTest1("NESSIE test vector #4", "32d10c7b8cf96570ca04ce37f2a19d84240d3a89", "abcdefghijklmnopqrstuvwxyz");
doTest1("NESSIE test vector #5", "84983e441c3bd26ebaae4aa1f95129e5e54670f1", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
doTest1("NESSIE test vector #6", "761c457bf73b14d27e9e9265c46f4b4dda11f940", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest1("NESSIE test vector #7", "50abf5706a150990a08b2c5ea40fa0e585554732", "1234567890".repeat(8));
// Out-commented for resource intensiveness (not much, but still...)
//doTest1("NESSIE test vector #8", "34aa973cd4c4daa4f61eeb2bdbad27316534016f", "a".repeat(1000000));
