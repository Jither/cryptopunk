// Methods for manipulation of matrices represented as 1-dimensional byte arrays.
// Generally there is support for both column-major order (i.e. column cells are stored consecutively)
// and row-major order (i.e. row cells are stored consecutively).

import { gcd } from "./cryptopunk.math";

// Does a juggling inplace byte rotation of a single row or column in a matrix represented as a
// 1-dimensional array.
// - In column-major order, a *row* will be rotated "shift" positions right
// - In row-major order, a *column* will be rotated "shift" positions down
// I.e.
//
// a e i m q <-- shift orientation -->
// b f j n r
// c g k o s
// d h l p t
//
// ... is represented as:
//
// a b c d e f g h i j k l m n o p q r s t
function matrixShiftMinor(matrix, majors, minors, minorIndex, shift)
{
	if (shift < 0)
	{
		shift += majors;
	}
	const setCount = gcd(shift, majors);
	
	for (let start = 0; start < setCount; start++)
	{
		let dest = start;
		const temp = matrix[minorIndex + start * minors];

		for (;;)
		{
			const source = (dest - shift + majors) % majors;
			if (source === start)
			{
				matrix[minorIndex + dest * minors] = temp;
				break;
			}
			matrix[minorIndex + dest * minors] = matrix[minorIndex + source * minors];
			dest = source;
		}
	}
}

export {
	matrixShiftMinor
};