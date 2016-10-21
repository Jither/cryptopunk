import test from "ava";
import { testAsciiHash } from "../_testutils";
import { RipeMd160Transform, RipeMd320Transform } from "transforms/hashes/ripemd160";

function doTest160(title, expectedHex, input)
{
	test("RIPEMD-160 hashes " + title, testAsciiHash, RipeMd160Transform, expectedHex, input);
}

function doTest320(title, expectedHex, input)
{
	test("RIPEMD-320 hashes " + title, testAsciiHash, RipeMd320Transform, expectedHex, input);
}

doTest160("test vector #1", "9c1185a5c5e9fc54612808977ee8f548b2258d31", "");
doTest160("test vector #2", "0bdc9d2d256b3ee9daae347be6f4dc835a467ffe", "a");
doTest160("test vector #3", "8eb208f7e05d987a9b044a8e98c6b087f15a0bfc", "abc");
doTest160("test vector #4", "5d0689ef49d2fae572b881b123a85ffa21595f36", "message digest");
doTest160("test vector #5", "f71c27109c692c1b56bbdceb5b9d2865b3708dbc", "abcdefghijklmnopqrstuvwxyz");
doTest160("test vector #6", "12a053384a9c0c88e405a06c27dcf49ada62eb2b", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
doTest160("test vector #7", "b0e20b6e3116640286ed3a87a5713079b21f5189", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest160("test vector #8", "9b752e45573d4b39f4dbd3323cab82bf63326bfb", "1234567890".repeat(8));
// Out-commented for resource intensiveness (not much, but still...)
//doTest160("test vector #9", "52783243c1697bdbe16d37f97f68f08325dc1528", "a".repeat(1000000));

doTest320("test vector #1", "22d65d5661536cdc75c1fdf5c6de7b41b9f27325ebc61e8557177d705a0ec880151c3a32a00899b8", "");
doTest320("test vector #2", "ce78850638f92658a5a585097579926dda667a5716562cfcf6fbe77f63542f99b04705d6970dff5d", "a");
doTest320("test vector #3", "de4c01b3054f8930a79d09ae738e92301e5a17085beffdc1b8d116713e74f82fa942d64cdbc4682d", "abc");
doTest320("test vector #4", "3a8e28502ed45d422f68844f9dd316e7b98533fa3f2a91d29f84d425c88d6b4eff727df66a7c0197", "message digest");
doTest320("test vector #5", "cabdb1810b92470a2093aa6bce05952c28348cf43ff60841975166bb40ed234004b8824463e6b009", "abcdefghijklmnopqrstuvwxyz");
doTest320("test vector #6", "d034a7950cf722021ba4b84df769a5de2060e259df4c9bb4a4268c0e935bbc7470a969c9d072a1ac", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
doTest320("test vector #7", "ed544940c86d67f250d232c30b7b3e5770e0c60c8cb9a4cafe3b11388af9920e1b99230b843c86a4", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest320("test vector #8", "557888af5f6d8ed62ab66945c6d2a0a47ecd5341e915eb8fea1d0524955f825dc717e4a008ab2d42", "1234567890".repeat(8));
// Out-commented for resource intensiveness (not much, but still...)
//doTest320("test vector #9", "bdee37f4371e20646b8b0d862dda16292ae36f40965e8c8509e63d1dbddecc503e2b63eb9245bb66", "a".repeat(1000000));
