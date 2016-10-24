import test from "ava";
import { testAsciiHash } from "../_testutils";
import { Sha224Transform, Sha256Transform } from "transforms/hashes/sha256";
import { Sha384Transform, Sha512Transform } from "transforms/hashes/sha512";

function doTest224(title, expectedHex, input)
{
	test("SHA-224 hashes " + title, testAsciiHash, Sha224Transform, expectedHex, input);
}

function doTest256(title, expectedHex, input)
{
	test("SHA-256 hashes " + title, testAsciiHash, Sha256Transform, expectedHex, input);
}

function doTest384(title, expectedHex, input)
{
	test("SHA-384 hashes " + title, testAsciiHash, Sha384Transform, expectedHex, input);
}

function doTest512(title, expectedHex, input)
{
	test("SHA-512 hashes " + title, testAsciiHash, Sha512Transform, expectedHex, input);
}


doTest224("std test vector #0", "d14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f", "");
doTest224("std test vector #1", "abd37534c7d9a2efb9465de931cd7055ffdb8879563ae98078d6d6d5", "a");
doTest224("std test vector #2", "23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7", "abc");
doTest224("std test vector #3", "2cb21c83ae2f004de7e81c3c7019cbcb65b71ab656b22d6d0c39b8eb", "message digest");
doTest224("std test vector #4", "45a5f72c39c5cff2522eb3429799e49e5f44b356ef926bcf390dccc2", "abcdefghijklmnopqrstuvwxyz");
doTest224("std test vector #5", "bff72b4fcb7d75e5632900ac5f90d219e05e97a7bde72e740db393d9", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest224("std test vector #6", "b50aecbe4e9bb0b57bc5f3ae760a8e01db24f203fb3cdcd13148046e", "1234567890".repeat(8));

doTest256("NESSIE test vector #0", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "");
doTest256("NESSIE test vector #1", "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb", "a");
doTest256("NESSIE test vector #2", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "abc");
doTest256("NESSIE test vector #3", "f7846f55cf23e14eebeab5b4e1550cad5b509e3348fbc4efa3a1413d393cb650", "message digest");
doTest256("NESSIE test vector #4", "71c480df93d6ae2f1efad1447c66c9525e316218cf51fc8d9ed832f2daf18b73", "abcdefghijklmnopqrstuvwxyz");
doTest256("NESSIE test vector #5", "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
doTest256("NESSIE test vector #6", "db4bfcbd4da0cd85a60c3c37d3fbd8805c77f15fc6b1fdfe614ee0a7c8fdb4c0", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest256("NESSIE test vector #7", "f371bc4a311f2b009eef952dd83ca80e2b60026c8e935592d0f9c308453c813e", "1234567890".repeat(8));
// Out-commented for resource intensiveness (not much, but still...)
//doTest256("NESSIE test vector #8", "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0", "a".repeat(1000000));

doTest384("NESSIE test vector #0", "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b", "");
doTest384("NESSIE test vector #1", "54a59b9f22b0b80880d8427e548b7c23abd873486e1f035dce9cd697e85175033caa88e6d57bc35efae0b5afd3145f31", "a");
doTest384("NESSIE test vector #2", "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7", "abc");
doTest384("NESSIE test vector #3", "473ed35167ec1f5d8e550368a3db39be54639f828868e9454c239fc8b52e3c61dbd0d8b4de1390c256dcbb5d5fd99cd5", "message digest");
doTest384("NESSIE test vector #4", "feb67349df3db6f5924815d6c3dc133f091809213731fe5c7b5f4999e463479ff2877f5f2936fa63bb43784b12f3ebb4", "abcdefghijklmnopqrstuvwxyz");
doTest384("NESSIE test vector #5", "3391fdddfc8dc7393707a65b1b4709397cf8b1d162af05abfe8f450de5f36bc6b0455a8520bc4e6f5fe95b1fe3c8452b", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
doTest384("NESSIE test vector #6", "1761336e3f7cbfe51deb137f026f89e01a448e3b1fafa64039c1464ee8732f11a5341a6f41e0c202294736ed64db1a84", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest384("NESSIE test vector #7", "b12932b0627d1c060942f5447764155655bd4da0c9afa6dd9b9ef53129af1b8fb0195996d2de9ca0df9d821ffee67026", "1234567890".repeat(8));
// Out-commented for resource intensiveness
// doTest384("NESSIE test vector #8", "9d0e1809716474cb086e834e310a4a1ced149e9c00f248527972cec5704c2a5b07b8b3dc38ecc4ebae97ddd87f3d8985", "a".repeat(1000000));

doTest512("NESSIE test vector #0", "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e", "");
doTest512("NESSIE test vector #1", "1f40fc92da241694750979ee6cf582f2d5d7d28e18335de05abc54d0560e0f5302860c652bf08d560252aa5e74210546f369fbbbce8c12cfc7957b2652fe9a75", "a");
doTest512("NESSIE test vector #2", "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f", "abc");
doTest512("NESSIE test vector #3", "107dbf389d9e9f71a3a95f6c055b9251bc5268c2be16d6c13492ea45b0199f3309e16455ab1e96118e8a905d5597b72038ddb372a89826046de66687bb420e7c", "message digest");
doTest512("NESSIE test vector #4", "4dbff86cc2ca1bae1e16468a05cb9881c97f1753bce3619034898faa1aabe429955a1bf8ec483d7421fe3c1646613a59ed5441fb0f321389f77f48a879c7b1f1", "abcdefghijklmnopqrstuvwxyz");
doTest512("NESSIE test vector #5", "204a8fc6dda82f0a0ced7beb8e08a41657c16ef468b228a8279be331a703c33596fd15c13b1b07f9aa1d3bea57789ca031ad85c7a71dd70354ec631238ca3445", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
doTest512("NESSIE test vector #6", "1e07be23c26a86ea37ea810c8ec7809352515a970e9253c26f536cfc7a9996c45c8370583e0a78fa4a90041d71a4ceab7423f19c71b9d5a3e01249f0bebd5894", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
doTest512("NESSIE test vector #7", "72ec1ef1124a45b047e8b7c75a932195135bb61de24ec0d1914042246e0aec3a2354e093d76f3048b456764346900cb130d2a4fd5dd16abb5e30bcb850dee843", "1234567890".repeat(8));
// Out-commented for resource intensiveness
// doTest512("NESSIE test vector #8", "e718483d0ce769644e2e42c7bc15b4638e1f98b13b2044285632a803afa973ebde0ff244877ea60a4cb0432ce577c31beb009c5c2c49aa2e4eadb217ad8cc09b", "a".repeat(1000000));
