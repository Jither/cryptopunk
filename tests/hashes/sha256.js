import test from "ava";
import { Sha224Transform, Sha256Transform } from "transforms/hashes/sha256";
import { hexToBytes, asciiToBytes } from "cryptopunk.utils";

function testAsciiSha224(t, expectedHex, input)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = asciiToBytes(input);
	const tf = new Sha224Transform();
	t.deepEqual(tf.transform(bytesInput), expected);
}

function testAsciiSha256(t, expectedHex, input)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = asciiToBytes(input);
	const tf = new Sha256Transform();
	t.deepEqual(tf.transform(bytesInput), expected);
}

test("SHA-256 hashes NESSIE test vector #0", testAsciiSha256, "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", "");
test("SHA-256 hashes NESSIE test vector #1", testAsciiSha256, "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb", "a");
test("SHA-256 hashes NESSIE test vector #2", testAsciiSha256, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "abc");
test("SHA-256 hashes NESSIE test vector #3", testAsciiSha256, "f7846f55cf23e14eebeab5b4e1550cad5b509e3348fbc4efa3a1413d393cb650", "message digest");
test("SHA-256 hashes NESSIE test vector #4", testAsciiSha256, "71c480df93d6ae2f1efad1447c66c9525e316218cf51fc8d9ed832f2daf18b73", "abcdefghijklmnopqrstuvwxyz");
test("SHA-256 hashes NESSIE test vector #5", testAsciiSha256, "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1", "abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq");
test("SHA-256 hashes NESSIE test vector #6", testAsciiSha256, "db4bfcbd4da0cd85a60c3c37d3fbd8805c77f15fc6b1fdfe614ee0a7c8fdb4c0", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
test("SHA-256 hashes NESSIE test vector #7", testAsciiSha256, "f371bc4a311f2b009eef952dd83ca80e2b60026c8e935592d0f9c308453c813e", "1234567890".repeat(8));
// Out-commented for resource intensiveness (not much, but still...)
//test("SHA-256 hashes NESSIE test vector #8", testAsciiSha256, "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0", "a".repeat(1000000));

test("SHA-224 hashes std test vector #0", testAsciiSha224, "d14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f", "");
test("SHA-224 hashes std test vector #1", testAsciiSha224, "abd37534c7d9a2efb9465de931cd7055ffdb8879563ae98078d6d6d5", "a");
test("SHA-224 hashes std test vector #2", testAsciiSha224, "23097d223405d8228642a477bda255b32aadbce4bda0b3f7e36c9da7", "abc");
test("SHA-224 hashes std test vector #3", testAsciiSha224, "2cb21c83ae2f004de7e81c3c7019cbcb65b71ab656b22d6d0c39b8eb", "message digest");
test("SHA-224 hashes std test vector #4", testAsciiSha224, "45a5f72c39c5cff2522eb3429799e49e5f44b356ef926bcf390dccc2", "abcdefghijklmnopqrstuvwxyz");
test("SHA-224 hashes std test vector #5", testAsciiSha224, "bff72b4fcb7d75e5632900ac5f90d219e05e97a7bde72e740db393d9", "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
test("SHA-224 hashes std test vector #6", testAsciiSha224, "b50aecbe4e9bb0b57bc5f3ae760a8e01db24f203fb3cdcd13148046e", "1234567890".repeat(8));
