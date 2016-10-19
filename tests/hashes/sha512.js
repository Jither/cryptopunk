import test from "ava";
import { testAsciiHash } from "../_testutils";
import { Sha384Transform, Sha512Transform } from "transforms/hashes/sha512";

test("SHA-512 hashes NESSIE test vector #0", testAsciiHash, Sha512Transform, "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e", "");
test("SHA-512 hashes NESSIE test vector #1", testAsciiHash, Sha512Transform, "1f40fc92da241694750979ee6cf582f2d5d7d28e18335de05abc54d0560e0f5302860c652bf08d560252aa5e74210546f369fbbbce8c12cfc7957b2652fe9a75", "a");
test("SHA-512 hashes NESSIE test vector #2", testAsciiHash, Sha512Transform, "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f", "abc");
test("SHA-512 hashes NESSIE test vector #3", testAsciiHash, Sha512Transform, "107dbf389d9e9f71a3a95f6c055b9251bc5268c2be16d6c13492ea45b0199f3309e16455ab1e96118e8a905d5597b72038ddb372a89826046de66687bb420e7c", "message digest");
test("SHA-512 hashes NESSIE test vector #4", testAsciiHash, Sha512Transform, "4dbff86cc2ca1bae1e16468a05cb9881c97f1753bce3619034898faa1aabe429955a1bf8ec483d7421fe3c1646613a59ed5441fb0f321389f77f48a879c7b1f1", "abcdefghijklmnopqrstuvwxyz");
test("SHA-512 hashes NESSIE test vector #5", testAsciiHash, Sha512Transform, "204a8fc6dda82f0a0ced7beb8e08a41657c16ef468b228a8279be331a703c33596fd15c13b1b07f9aa1d3bea57789ca031ad85c7a71dd70354ec631238ca3445", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
test("SHA-512 hashes NESSIE test vector #6", testAsciiHash, Sha512Transform, "1e07be23c26a86ea37ea810c8ec7809352515a970e9253c26f536cfc7a9996c45c8370583e0a78fa4a90041d71a4ceab7423f19c71b9d5a3e01249f0bebd5894", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
test("SHA-512 hashes NESSIE test vector #7", testAsciiHash, Sha512Transform, "72ec1ef1124a45b047e8b7c75a932195135bb61de24ec0d1914042246e0aec3a2354e093d76f3048b456764346900cb130d2a4fd5dd16abb5e30bcb850dee843", "1234567890".repeat(8));
// Out-commented for resource intensiveness
// test("SHA-512 hashes NESSIE test vector #8", testAsciiHash, Sha512Transform, "e718483d0ce769644e2e42c7bc15b4638e1f98b13b2044285632a803afa973ebde0ff244877ea60a4cb0432ce577c31beb009c5c2c49aa2e4eadb217ad8cc09b", "a".repeat(1000000));

test("SHA-384 hashes NESSIE test vector #0", testAsciiHash, Sha384Transform, "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b", "");
test("SHA-384 hashes NESSIE test vector #1", testAsciiHash, Sha384Transform, "54a59b9f22b0b80880d8427e548b7c23abd873486e1f035dce9cd697e85175033caa88e6d57bc35efae0b5afd3145f31", "a");
test("SHA-384 hashes NESSIE test vector #2", testAsciiHash, Sha384Transform, "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7", "abc");
test("SHA-384 hashes NESSIE test vector #3", testAsciiHash, Sha384Transform, "473ed35167ec1f5d8e550368a3db39be54639f828868e9454c239fc8b52e3c61dbd0d8b4de1390c256dcbb5d5fd99cd5", "message digest");
test("SHA-384 hashes NESSIE test vector #4", testAsciiHash, Sha384Transform, "feb67349df3db6f5924815d6c3dc133f091809213731fe5c7b5f4999e463479ff2877f5f2936fa63bb43784b12f3ebb4", "abcdefghijklmnopqrstuvwxyz");
test("SHA-384 hashes NESSIE test vector #5", testAsciiHash, Sha384Transform, "3391fdddfc8dc7393707a65b1b4709397cf8b1d162af05abfe8f450de5f36bc6b0455a8520bc4e6f5fe95b1fe3c8452b", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
test("SHA-384 hashes NESSIE test vector #6", testAsciiHash, Sha384Transform, "1761336e3f7cbfe51deb137f026f89e01a448e3b1fafa64039c1464ee8732f11a5341a6f41e0c202294736ed64db1a84", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
test("SHA-384 hashes NESSIE test vector #7", testAsciiHash, Sha384Transform, "b12932b0627d1c060942f5447764155655bd4da0c9afa6dd9b9ef53129af1b8fb0195996d2de9ca0df9d821ffee67026", "1234567890".repeat(8));
// Out-commented for resource intensiveness
// test("SHA-384 hashes NESSIE test vector #8", testAsciiHash, Sha384Transform, "9d0e1809716474cb086e834e310a4a1ced149e9c00f248527972cec5704c2a5b07b8b3dc38ecc4ebae97ddd87f3d8985", "a".repeat(1000000));

