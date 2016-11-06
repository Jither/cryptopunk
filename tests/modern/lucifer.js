import test from "ava";
import { LuciferEncryptTransform, LuciferDecryptTransform } from "transforms/modern/lucifer";
import { hexToBytes } from "cryptopunk.utils";

test("LUCIFER (LSB0) does exercise (1000 iterations)", t => {
	let key = hexToBytes("0123456789abcdeffedcba9876543210");
	let plain = hexToBytes("00000000000000000000000000000000");
	const tf = new LuciferEncryptTransform();
	let result;
	for (let i = 0; i < 1000; i++)
	{
		result = tf.transform(plain, key);
		// Next iteration: Encrypt key (as plaintext) with previous result (as key)
		plain = key;
		key = result;
	}

	t.deepEqual(hexToBytes("a388c4ffcf9905f381ce2ce3606253a4"), result);
});
test("LUCIFER (MSB0) does exercise (1000 iterations)", t => {
	let key = hexToBytes("0123456789abcdeffedcba9876543210");
	let plain = hexToBytes("00000000000000000000000000000000");
	const tf = new LuciferEncryptTransform();
	const options = { variant: "msb0" };
	let result;
	for (let i = 0; i < 1000; i++)
	{
		result = tf.transform(plain, key, options);
		// Next iteration: Encrypt key (as plaintext) with previous result (as key)
		plain = key;
		key = result;
	}

	t.deepEqual(hexToBytes("6b952f8fdfa35b335f849757fec58c07"), result);
});