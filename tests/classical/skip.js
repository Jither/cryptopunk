import test from "ava";
import { SkipDecryptTransform, SkipEncryptTransform } from "transforms/classical/skip";
import { TransformError } from "transforms/transforms";

test("Decrypts simple skip cipher", t => {
	const tf = new SkipDecryptTransform();
	
	// Last step of KRYPTOS K3
	t.is(tf.transform(
		"ENDYAHROHNLSRHEOCPTEOIBIDYSHNAIA" +
		"CHTNREYULDSLLSLLNOHSNOSMRWXMNE" +
		"TPRNGATIHNRARPESLNNELEBLPIIACAE" +
		"WMTWNDITEENRAHCTENEUDRETNHAEOE" +
		"TFOLSEDTIWENHAEIOYTEYQHEENCTAYCR" +
		"EIFTBRSPAMHHEWENATAMATEGYEERLB" +
		"TEEFOASFIOTUETUAEOTOARMAEERTNRTI" +
		"BSEDDNIAAHTTMSTEWPIEROAGRIEWFEB" +
		"AECTDDHILCEIHSITEGOEAOSDDRYDLORIT" +
		"RKLMLEHAGTDHARDPNEOHMGFMFEUHE" +
		"ECDMRIPFEIMEHNLSSTTRTVDOHW?",
		{ start: 191, skip: 192 }
	),
		"SLOWLYDESPARATLYSLOWLYTHEREMAINS" +
		"OFPASSAGEDEBRISTHATENCUMBEREDT" +
		"HELOWERPARTOFTHEDOORWAYWASREMOV" +
		"EDWITHTREMBLINGHANDSIMADEATINY" +
		"BREACHINTHEUPPERLEFTHANDCORNERAN" +
		"DTHENWIDENINGTHEHOLEALITTLEIIN" +
		"SERTEDTHECANDLEANDPEEREDINTHEHOT" +
		"AIRESCAPINGFROMTHECHAMBERCAUSED" +
		"THEFLAMETOFLICKERBUTPRESENTLYDETA" +
		"ILSOFTHEROOMWITHINEMERGEDFROM" +
		"THEMISTXCANYOUSEEANYTHINGQ?"
	);
});

test("Decryption throws when not full coverage", t => {
	const tf = new SkipDecryptTransform();

	// 3 is not coprime with 9 (message length). This means we'd only get ADGADGADG...
	const error = t.throws(() => tf.transform("ABCDEFGHI", { start: 0, skip: 3 }));
	t.true(error instanceof TransformError);
});

test("Decrypt handles empty string gracefully", t => {
	const tf = new SkipDecryptTransform();

	t.is(tf.transform(""), "");
});

test("Encrypts simple skip cipher", t => {
	const tf = new SkipEncryptTransform();
	
	// Last step of KRYPTOS K3
	t.is(tf.transform(
		"SLOWLYDESPARATLYSLOWLYTHEREMAINS" +
		"OFPASSAGEDEBRISTHATENCUMBEREDT" +
		"HELOWERPARTOFTHEDOORWAYWASREMOV" +
		"EDWITHTREMBLINGHANDSIMADEATINY" +
		"BREACHINTHEUPPERLEFTHANDCORNERAN" +
		"DTHENWIDENINGTHEHOLEALITTLEIIN" +
		"SERTEDTHECANDLEANDPEEREDINTHEHOT" +
		"AIRESCAPINGFROMTHECHAMBERCAUSED" +
		"THEFLAMETOFLICKERBUTPRESENTLYDETA" +
		"ILSOFTHEROOMWITHINEMERGEDFROM" +
		"THEMISTXCANYOUSEEANYTHINGQ?",
		{ start: 191, skip: 192 }
	),
		"ENDYAHROHNLSRHEOCPTEOIBIDYSHNAIA" +
		"CHTNREYULDSLLSLLNOHSNOSMRWXMNE" +
		"TPRNGATIHNRARPESLNNELEBLPIIACAE" +
		"WMTWNDITEENRAHCTENEUDRETNHAEOE" +
		"TFOLSEDTIWENHAEIOYTEYQHEENCTAYCR" +
		"EIFTBRSPAMHHEWENATAMATEGYEERLB" +
		"TEEFOASFIOTUETUAEOTOARMAEERTNRTI" +
		"BSEDDNIAAHTTMSTEWPIEROAGRIEWFEB" +
		"AECTDDHILCEIHSITEGOEAOSDDRYDLORIT" +
		"RKLMLEHAGTDHARDPNEOHMGFMFEUHE" +
		"ECDMRIPFEIMEHNLSSTTRTVDOHW?"
	);
});

test("Encryption throws when not full coverage", t => {
	const tf = new SkipEncryptTransform();

	// 3 is not coprime with 9 (message length). This means we'd only get ADGADGADG...
	const error = t.throws(() => tf.transform("ABCDEFGHI", { start: 0, skip: 3 }));
	t.true(error instanceof TransformError);
});

test("Encrypt handles empty string gracefully", t => {
	const tf = new SkipEncryptTransform();

	t.is(tf.transform(""), "");
});