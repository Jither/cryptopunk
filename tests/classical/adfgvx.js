import test from "ava";
import { AdfgvxEncryptTransform, AdfgvxDecryptTransform } from "transforms/classical/adfgvx";
import { TransformError } from "transforms/transforms";

test("Throws for empty key", t => {
	const enc = new AdfgvxEncryptTransform();

	let error = t.throws(() => enc.transform("Hello friend", "btalpdhozkqfvsngjcuxmrewy", ""));
	t.true(error instanceof TransformError);

	const dec = new AdfgvxDecryptTransform();

	error = t.throws(() => dec.transform("Hello friend", "btalpdhozkqfvsngjcuxmrewy", ""));
	t.true(error instanceof TransformError);
});

test("Throws for empty alphabet", t => {
	const enc = new AdfgvxEncryptTransform();

	let error = t.throws(() => enc.transform("Hello friend", "", "ECORP"));
	t.true(error instanceof TransformError);

	const dec = new AdfgvxDecryptTransform();

	error = t.throws(() => dec.transform("Hello friend", "", "ECORP"));
	t.true(error instanceof TransformError);
});

test("Throws for too long alphabet", t => {
	const options = { headers: "ADFGX" };

	const enc = new AdfgvxEncryptTransform();

	let error = t.throws(() => enc.transform("fivenine", "abcdefghijklmnopqrstuvwxyz", "MOBLEY", options));
	t.true(error instanceof TransformError);

	const dec = new AdfgvxDecryptTransform();

	error = t.throws(() => dec.transform("fivenine", "abcdefghijklmnopqrstuvwxyz", "MOBLEY", options));
	t.true(error instanceof TransformError);
});

test("Throws for key with duplicate characters", t => {
	const enc = new AdfgvxEncryptTransform();

	let error = t.throws(() => enc.transform("fsociety", "btalpdhozkqfvsngjcuxmrewy", "endgame"));
	t.true(error instanceof TransformError);

	const dec = new AdfgvxDecryptTransform();

	error = t.throws(() => dec.transform("fsociety", "btalpdhozkqfvsngjcuxmrewy", "endgame"));
	t.true(error instanceof TransformError);
});

test("Decryption throws for wrong ciphertext length", t => {
	const dec = new AdfgvxDecryptTransform();

	const error = t.throws(() => dec.transform("FAXDFADDDGDGFFFAFAXAFAF", "na1c3h8tb2ome5wrpd4f6g7i9j0klqsuvxyz", "privacy"));
	t.true(error instanceof TransformError);
});

test("Encryption handles empty string gracefully", t => {
	const tf = new AdfgvxEncryptTransform();

	t.is(tf.transform("", "na1c3h8tb2ome5wrpd4f6g7i9j0klqsuvxyz", "privacy"), "");
});

test("Decryption handles empty string gracefully", t => {
	const tf = new AdfgvxDecryptTransform();

	t.is(tf.transform("", "na1c3h8tb2ome5wrpd4f6g7i9j0klqsuvxyz", "privacy"), "");
});