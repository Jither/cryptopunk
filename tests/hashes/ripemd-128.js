import test from "ava";
import { testAsciiHash } from "../_testutils";
import { RipeMd128Transform, RipeMd256Transform } from "transforms/hashes/ripemd-128";

function doTest128(title, expectedHex, input)
{
	test("RIPEMD-128 hashes " + title, testAsciiHash, RipeMd128Transform, expectedHex, input);
}

function doTest256(title, expectedHex, input)
{
	test("RIPEMD-256 hashes " + title, testAsciiHash, RipeMd256Transform, expectedHex, input);
}

doTest128("test vector #1", "cdf26213a150dc3ecb610f18f6b38b46", "");
doTest128("test vector #2", "86be7afa339d0fc7cfc785e72f578d33", "a");
doTest128("test vector #3", "c14a12199c66e4ba84636b0f69144c77", "abc");
doTest128("test vector #4", "9e327b3d6e523062afc1132d7df9d1b8", "message digest");
doTest128("test vector #5", "fd2aa607f71dc8f510714922b371834e", "abcdefghijklmnopqrstuvwxyz");
doTest128("test vector #6", "a1aa0689d0fafa2ddc22e88b49133a06", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
doTest128("test vector #7", "d1e959eb179c911faea4624c60c5c702", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest128("test vector #8", "3f45ef194732c2dbb2c4a2c769795fa3", "1234567890".repeat(8));
// Out-commented for resource intensiveness (not much, but still...)
//doTest128("test vector #9", "4a7f5723f954eba1216c9d8f6320431f", "a".repeat(1000000));

doTest256("test vector #1", "02ba4c4e5f8ecd1877fc52d64d30e37a2d9774fb1e5d026380ae0168e3c5522d", "");
doTest256("test vector #2", "f9333e45d857f5d90a91bab70a1eba0cfb1be4b0783c9acfcd883a9134692925", "a");
doTest256("test vector #3", "afbd6e228b9d8cbbcef5ca2d03e6dba10ac0bc7dcbe4680e1e42d2e975459b65", "abc");
doTest256("test vector #4", "87e971759a1ce47a514d5c914c392c9018c7c46bc14465554afcdf54a5070c0e", "message digest");
doTest256("test vector #5", "649d3034751ea216776bf9a18acc81bc7896118a5197968782dd1fd97d8d5133", "abcdefghijklmnopqrstuvwxyz");
doTest256("test vector #6", "3843045583aac6c8c8d9128573e7a9809afb2a0f34ccc36ea9e72f16f6368e3f", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
doTest256("test vector #7", "5740a408ac16b720b84424ae931cbb1fe363d1d0bf4017f1a89f7ea6de77a0b8", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest256("test vector #8", "06fdcc7a409548aaf91368c06a6275b553e3f099bf0ea4edfd6778df89a890dd", "1234567890".repeat(8));
// Out-commented for resource intensiveness (not much, but still...)
//doTest256("test vector #9", "ac953744e10e31514c150d4d8d7b677342e33399788296e43ae4850ce4f97978", "a".repeat(1000000));
