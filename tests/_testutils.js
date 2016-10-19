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
	t.deepEqual(tf.transform(input, ...rest), expected);
}

function testAsciiHash(t, transformType, expectedHex, input, ...rest)
{
	const expected = hexToBytes(expectedHex);
	const bytesInput = asciiToBytes(input);
	const tf = new transformType();
	t.deepEqual(tf.transform(bytesInput, ...rest), expected);
}

export {
	testStringToBytes,
	testBytesToString,
	testAsciiHash
};