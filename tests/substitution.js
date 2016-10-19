import test from "ava";
import { SimpleSubstitutionTransform } from "transforms/substitution";
import { TransformError } from "transforms/transforms";

test("Does simple substitution (default Atbash)", t => {
	const tf = new SimpleSubstitutionTransform();
	
	t.is(tf.transform("the quick brown fox jumps over the lazy dog."), "gsv jfrxp yildm ulc qfnkh levi gsv ozab wlt.");
});

test("Does mixed case substitution (default Atbash)", t => {
	const tf = new SimpleSubstitutionTransform();
	
	t.is(tf.transform("The Quick Brown Fox Jumps Over The Lazy Dog."), "Gsv Jfrxp Yildm Ulc Qfnkh Levi Gsv Ozab Wlt.");
});

test("Handles custom alphabet", t => {
	const tf = new SimpleSubstitutionTransform();
	
	t.is(tf.transform("abcd123!", { alphabet: "abcd123!", substitutionAlphabet: "1234abc?"}), "1234abc?");
});


test("Handles case sensitive substitution", t => {
	const tf = new SimpleSubstitutionTransform();
	
	t.is(tf.transform("abcdABCD", { alphabet: "ABCDabcd", substitutionAlphabet: "abcd1234", ignoreCase: false }), "1234abcd");
});

test("Handles empty string gracefully", t => {
	const tf = new SimpleSubstitutionTransform();

	t.is(tf.transform(""), "");
});