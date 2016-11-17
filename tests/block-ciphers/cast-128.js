import test from "ava";
import { Cast128EncryptTransform, Cast128DecryptTransform } from "transforms/block-ciphers/cast-128";
import { hexToBytes } from "cryptopunk.utils";

// Skipped by default - it's REALLY time consuming
test.skip("RFC 2144 Full Maintenance Test (Encrypt)", t => {
	const tf = new Cast128EncryptTransform();
	const a = hexToBytes("01 23 45 67 12 34 56 78 23 45 67 89 34 56 78 9A");
	const b = hexToBytes("01 23 45 67 12 34 56 78 23 45 67 89 34 56 78 9A");

	for (let i = 0; i < 1000000; i++)
	{
		a.set(tf.transform(a.subarray(0,  8), b), 0);
		a.set(tf.transform(a.subarray(8, 16), b), 8);
		b.set(tf.transform(b.subarray(0,  8), a), 0);
		b.set(tf.transform(b.subarray(8, 16), a), 8);
	}

	t.deepEqual(a, hexToBytes("EE A9 D0 A2 49 FD 3B A6 B3 43 6F B8 9D 6D CA 92"));
	t.deepEqual(b, hexToBytes("B2 C9 5E B0 0C 31 AD 71 80 AC 05 B8 E8 3D 69 6E"));
});

test.skip("RFC 2144 Full Maintenance Test (Decrypt)", t => {
	const tf = new Cast128DecryptTransform();
	const a = hexToBytes("EE A9 D0 A2 49 FD 3B A6 B3 43 6F B8 9D 6D CA 92");
	const b = hexToBytes("B2 C9 5E B0 0C 31 AD 71 80 AC 05 B8 E8 3D 69 6E");

	for (let i = 0; i < 1000000; i++)
	{
		b.set(tf.transform(b.subarray(8, 16), a), 8);
		b.set(tf.transform(b.subarray(0,  8), a), 0);
		a.set(tf.transform(a.subarray(8, 16), b), 8);
		a.set(tf.transform(a.subarray(0,  8), b), 0);
	}

	t.deepEqual(a, hexToBytes("01 23 45 67 12 34 56 78 23 45 67 89 34 56 78 9A"));
	t.deepEqual(b, hexToBytes("01 23 45 67 12 34 56 78 23 45 67 89 34 56 78 9A"));
});