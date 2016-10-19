import test from "ava";
import { TransformError } from "transforms/transforms";
import {
	Base32ToBytesTransform, 
	Base32HexToBytesTransform, 
	Base64ToBytesTransform, 
	Base64UrlToBytesTransform
} from "transforms/base-n";

test("Decodes Base32", t => {
	const tf = new Base32ToBytesTransform();
	
	t.deepEqual(tf.transform("MY======"), [0x66]);
	t.deepEqual(tf.transform("MZXQ===="), [0x66, 0x6f]);
	t.deepEqual(tf.transform("MZXW6==="), [0x66, 0x6f, 0x6f]);
	t.deepEqual(tf.transform("MZXW6YQ="), [0x66, 0x6f, 0x6f, 0x62]);
	t.deepEqual(tf.transform("MZXW6YTB"), [0x66, 0x6f, 0x6f, 0x62, 0x61]);
	t.deepEqual(tf.transform("MZXW6YTBOI======"), [0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]);
});

test("Base32 decoder handles lowercase", t => {
	const tf = new Base32ToBytesTransform();

	t.deepEqual(tf.transform("my======"), [0x66]);
	t.deepEqual(tf.transform("mzxq===="), [0x66, 0x6f]);
	t.deepEqual(tf.transform("mzxw6==="), [0x66, 0x6f, 0x6f]);
	t.deepEqual(tf.transform("mzxw6Yq="), [0x66, 0x6f, 0x6f, 0x62]);
	t.deepEqual(tf.transform("mzxw6Ytb"), [0x66, 0x6f, 0x6f, 0x62, 0x61]);
	t.deepEqual(tf.transform("mzxw6ytboi======"), [0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]);
});

test("Base32 decoder can infer padding", t => {
	const tf = new Base32ToBytesTransform();

	t.deepEqual(tf.transform("MY"), [0x66]);
	t.deepEqual(tf.transform("MZXQ"), [0x66, 0x6f]);
	t.deepEqual(tf.transform("MZXW6"), [0x66, 0x6f, 0x6f]);
	t.deepEqual(tf.transform("MZXW6YQ"), [0x66, 0x6f, 0x6f, 0x62]);
	t.deepEqual(tf.transform("MZXW6YTBOI"), [0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]);
});

test("Decodes Base32-HEX", t => {
	const tf = new Base32HexToBytesTransform();

	t.deepEqual(tf.transform("CO======"), [0x66]);
	t.deepEqual(tf.transform("CPNG===="), [0x66, 0x6f]);
	t.deepEqual(tf.transform("CPNMU==="), [0x66, 0x6f, 0x6f]);
	t.deepEqual(tf.transform("CPNMUOG="), [0x66, 0x6f, 0x6f, 0x62]);
	t.deepEqual(tf.transform("CPNMUOJ1"), [0x66, 0x6f, 0x6f, 0x62, 0x61]);
	t.deepEqual(tf.transform("CPNMUOJ1E8======"), [0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]);
});

test("Base32-HEX decoder handles lowercase", t => {
	const tf = new Base32HexToBytesTransform();

	t.deepEqual(tf.transform("co======"), [0x66]);
	t.deepEqual(tf.transform("cpng===="), [0x66, 0x6f]);
	t.deepEqual(tf.transform("cpnmu==="), [0x66, 0x6f, 0x6f]);
	t.deepEqual(tf.transform("cpnmuog="), [0x66, 0x6f, 0x6f, 0x62]);
	t.deepEqual(tf.transform("cpnmuoj1"), [0x66, 0x6f, 0x6f, 0x62, 0x61]);
	t.deepEqual(tf.transform("cpnmuoj1e8======"), [0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]);
});

test("Base32 decoder can infer padding", t => {
	const tf = new Base32HexToBytesTransform();

	t.deepEqual(tf.transform("CO"), [0x66]);
	t.deepEqual(tf.transform("CPNG"), [0x66, 0x6f]);
	t.deepEqual(tf.transform("CPNMU"), [0x66, 0x6f, 0x6f]);
	t.deepEqual(tf.transform("CPNMUOG"), [0x66, 0x6f, 0x6f, 0x62]);
	t.deepEqual(tf.transform("CPNMUOJ1E8"), [0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]);
});


test ("Base32 decoder handles empty string gracefully", t => {
	const tf = new Base32ToBytesTransform();

	t.deepEqual(tf.transform(""), []);
});

test("Decodes Base64", t => {
	const tf = new Base64ToBytesTransform();

	t.deepEqual(tf.transform("Zg=="), [0x66]);
	t.deepEqual(tf.transform("Zm8="), [0x66, 0x6f]);
	t.deepEqual(tf.transform("Zm9v"), [0x66, 0x6f, 0x6f]);
	t.deepEqual(tf.transform("Zm9vYg=="), [0x66, 0x6f, 0x6f, 0x62]);
	t.deepEqual(tf.transform("Zm9vYmE="), [0x66, 0x6f, 0x6f, 0x62, 0x61]);
	t.deepEqual(tf.transform("Zm9vYmFy"), [0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72]);
});

test("Base64 decoder can infer padding", t => {
	const tf = new Base64ToBytesTransform();

	t.deepEqual(tf.transform("Zg"), [0x66]);
	t.deepEqual(tf.transform("Zm8"), [0x66, 0x6f]);
	t.deepEqual(tf.transform("Zm9vYg"), [0x66, 0x6f, 0x6f, 0x62]);
	t.deepEqual(tf.transform("Zm9vYmE"), [0x66, 0x6f, 0x6f, 0x62, 0x61]);
});

test("Base64 decoder handles the non-alphanumeric chars", t => {
	const tf = new Base64ToBytesTransform();

	t.deepEqual(tf.transform("Pz8/Pj4+"), [0x3f, 0x3f, 0x3f, 0x3e, 0x3e, 0x3e]);
});

test("Base64 url-safe decoder handles the non-alphanumeric chars", t => {
	const tf = new Base64UrlToBytesTransform();

	t.deepEqual(tf.transform("Pz8_Pj4-"), [0x3f, 0x3f, 0x3f, 0x3e, 0x3e, 0x3e]);
});

test ("Base64 decoder handles empty string gracefully", t => {
	const tf = new Base64ToBytesTransform();

	t.deepEqual(tf.transform(""), []);
});
