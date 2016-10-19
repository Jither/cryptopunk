import test from "ava";
import { TransformError } from "transforms/transforms";
import { hexToBytes } from "cryptopunk.utils";
import {
	Base32ToBytesTransform, 
	Base32HexToBytesTransform, 
	Base64ToBytesTransform, 
	Base64UrlToBytesTransform
} from "transforms/base-n";

test("Decodes Base32", t => {
	const tf = new Base32ToBytesTransform();
	
	t.deepEqual(tf.transform("MY======"), hexToBytes("66"));
	t.deepEqual(tf.transform("MZXQ===="), hexToBytes("666f"));
	t.deepEqual(tf.transform("MZXW6==="), hexToBytes("666f6f"));
	t.deepEqual(tf.transform("MZXW6YQ="), hexToBytes("666f6f62"));
	t.deepEqual(tf.transform("MZXW6YTB"), hexToBytes("666f6f6261"));
	t.deepEqual(tf.transform("MZXW6YTBOI======"), hexToBytes("666f6f626172"));
});

test("Base32 decoder handles lowercase", t => {
	const tf = new Base32ToBytesTransform();

	t.deepEqual(tf.transform("my======"), hexToBytes("66"));
	t.deepEqual(tf.transform("mzxq===="), hexToBytes("666f"));
	t.deepEqual(tf.transform("mzxw6==="), hexToBytes("666f6f"));
	t.deepEqual(tf.transform("mzxw6yq="), hexToBytes("666f6f62"));
	t.deepEqual(tf.transform("mzxw6ytb"), hexToBytes("666f6f6261"));
	t.deepEqual(tf.transform("mzxw6ytboi======"), hexToBytes("666f6f626172"));
});

test("Base32 decoder can infer padding", t => {
	const tf = new Base32ToBytesTransform();

	t.deepEqual(tf.transform("MY"), hexToBytes("66"));
	t.deepEqual(tf.transform("MZXQ"), hexToBytes("666f"));
	t.deepEqual(tf.transform("MZXW6"), hexToBytes("666f6f"));
	t.deepEqual(tf.transform("MZXW6YQ"), hexToBytes("666f6f62"));
	t.deepEqual(tf.transform("MZXW6YTBOI"), hexToBytes("666f6f626172"));
});

test("Decodes Base32-HEX", t => {
	const tf = new Base32HexToBytesTransform();

	t.deepEqual(tf.transform("CO======"), hexToBytes("66"));
	t.deepEqual(tf.transform("CPNG===="), hexToBytes("666f"));
	t.deepEqual(tf.transform("CPNMU==="), hexToBytes("666f6f"));
	t.deepEqual(tf.transform("CPNMUOG="), hexToBytes("666f6f62"));
	t.deepEqual(tf.transform("CPNMUOJ1"), hexToBytes("666f6f6261"));
	t.deepEqual(tf.transform("CPNMUOJ1E8======"), hexToBytes("666f6f626172"));
});

test("Base32-HEX decoder handles lowercase", t => {
	const tf = new Base32HexToBytesTransform();

	t.deepEqual(tf.transform("co======"), hexToBytes("66"));
	t.deepEqual(tf.transform("cpng===="), hexToBytes("666f"));
	t.deepEqual(tf.transform("cpnmu==="), hexToBytes("666f6f"));
	t.deepEqual(tf.transform("cpnmuog="), hexToBytes("666f6f62"));
	t.deepEqual(tf.transform("cpnmuoj1"), hexToBytes("666f6f6261"));
	t.deepEqual(tf.transform("cpnmuoj1e8======"), hexToBytes("666f6f626172"));
});

test("Base32 decoder can infer padding", t => {
	const tf = new Base32HexToBytesTransform();

	t.deepEqual(tf.transform("CO"), hexToBytes("66"));
	t.deepEqual(tf.transform("CPNG"), hexToBytes("666f"));
	t.deepEqual(tf.transform("CPNMU"), hexToBytes("666f6f"));
	t.deepEqual(tf.transform("CPNMUOG"), hexToBytes("666f6f62"));
	t.deepEqual(tf.transform("CPNMUOJ1E8"), hexToBytes("666f6f626172"));
});


test ("Base32 decoder handles empty string gracefully", t => {
	const tf = new Base32ToBytesTransform();

	const actual = tf.transform("");
	t.true(actual instanceof Uint8Array);
	t.is(actual.length, 0);
});

test("Decodes Base64", t => {
	const tf = new Base64ToBytesTransform();

	t.deepEqual(tf.transform("Zg=="), hexToBytes("66"));
	t.deepEqual(tf.transform("Zm8="), hexToBytes("666f"));
	t.deepEqual(tf.transform("Zm9v"), hexToBytes("666f6f"));
	t.deepEqual(tf.transform("Zm9vYg=="), hexToBytes("666f6f62"));
	t.deepEqual(tf.transform("Zm9vYmE="), hexToBytes("666f6f6261"));
	t.deepEqual(tf.transform("Zm9vYmFy"), hexToBytes("666f6f626172"));
});

test("Base64 decoder can infer padding", t => {
	const tf = new Base64ToBytesTransform();

	t.deepEqual(tf.transform("Zg"), hexToBytes("66"));
	t.deepEqual(tf.transform("Zm8"), hexToBytes("666f"));
	t.deepEqual(tf.transform("Zm9vYg"), hexToBytes("666f6f62"));
	t.deepEqual(tf.transform("Zm9vYmE"), hexToBytes("666f6f6261"));
});

test("Base64 decoder handles the non-alphanumeric chars", t => {
	const tf = new Base64ToBytesTransform();

	t.deepEqual(tf.transform("Pz8/Pj4+"), hexToBytes("3f3f3f3e3e3e"));
});

test("Base64 url-safe decoder handles the non-alphanumeric chars", t => {
	const tf = new Base64UrlToBytesTransform();

	t.deepEqual(tf.transform("Pz8_Pj4-"), hexToBytes("3f3f3f3e3e3e"));
});

test ("Base64 decoder handles empty string gracefully", t => {
	const tf = new Base64ToBytesTransform();

	const actual = tf.transform("");
	t.true(actual instanceof Uint8Array);
	t.is(actual.length, 0);
});
