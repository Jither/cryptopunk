import { asciiToBytes, hexToBytes } from "../src/scripts-es6/cryptopunk.utils";

function testStringToBytes(t, transformType, expectedHex, input, ...rest)
{
	const expected = hexToBytes(expectedHex);
	const tf = new transformType();
	t.deepEqual(tf.transform(input, ...rest), expected);
}

function testBytesToString(t, transformType, expected, inputHex, ...rest)
{
	const input = hexToBytes(inputHex);
	const tf = new transformType();
	t.is(tf.transform(input, ...rest), expected);
}

function testAsciiHash(t, transformType, expectedHex, input, ...rest)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = asciiToBytes(input);
	const tf = new transformType();
	t.deepEqual(tf.transform(bytesInput, ...rest), expected);
}

function testBytesHash(t, transformType, expectedHex, inputHex, ...rest)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = hexToBytes(inputHex);
	const tf = new transformType();
	t.deepEqual(tf.transform(bytesInput, ...rest), expected);
}

function testHandlesEmptyString(t, transformType)
{
	const tf = new transformType();
	const actual = tf.transform("");
	t.true(actual instanceof Uint8Array);
	t.is(actual.length, 0);
}

function testHandlesEmptyArray(t, transformType)
{
	const tf = new transformType();

	t.is(tf.transform(new Uint8Array()), "");
}

export {
	testStringToBytes,
	testBytesToString,
	testAsciiHash,
	testBytesHash,
	testHandlesEmptyString,
	testHandlesEmptyArray
};