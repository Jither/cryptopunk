import test from "ava";
import { AdfgvxEncryptTransform, AdfgvxDecryptTransform } from "transforms/classical/adfgvx";
import { TransformError } from "transforms/transforms";

test("Does ADFGVX encryption (default)", t => {
	const tf = new AdfgvxEncryptTransform();

	t.is(tf.transform("ATTACKAT1200AM", "na1c3h8tb2ome5wrpd4f6g7i9j0klqsuvxyz", "privacy"), "DGDD DAGD DGAF ADDF DADV DVFA ADVX");
});

test("Does ADFGVX decryption (default)", t => {
	const tf = new AdfgvxDecryptTransform();
	
	t.is(tf.transform("DGDDDAGDDGAFADDFDADVDVFAADVX", "na1c3h8tb2ome5wrpd4f6g7i9j0klqsuvxyz", "privacy"), "ATTACKAT1200AM");
});

test("Encryption handles whitespace", t => {
	const tf = new AdfgvxEncryptTransform();

	t.is(tf.transform("Attack at 1200 am", "na1c3h 8tb2om e5wrpd 4f6g7i 9j0klq suvxyz", "privacy"), "DGDD DAGD DGAF ADDF DADV DVFA ADVX");
});

test("Decryption handles whitespace", t => {
	const tf = new AdfgvxDecryptTransform();
	
	t.is(tf.transform("DGDD DAGD DG AFADD FDAD VDVFA ADVX ", "na1c3h 8tb2om e5wrpd 4f6g7i 9j0klq suvxyz", "privacy"), "ATTACKAT1200AM");
});

test("Does ADFGX encryption", t => {
	const tf = new AdfgvxEncryptTransform();
	const options = { headers: "ADFGX" };
	t.is(tf.transform("attackatonce", "btalpdhozkqfvsngjcuxmrewy", "cargo", options), "FAXD FADD DGDG FFFA FAXA FAFX");
});

test("Does ADFGX decryption", t => {
	const tf = new AdfgvxDecryptTransform();
	const options = { headers: "ADFGX" };
	t.is(tf.transform("FAXDFADDDGDGFFFAFAXAFAFX", "btalpdhozkqfvsngjcuxmrewy", "cargo", options), "ATTACKATONCE");
});

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