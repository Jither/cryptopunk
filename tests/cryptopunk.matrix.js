import test from "ava";
import { gaussJordan } from "cryptopunk.matrix";

function testGaussJordan(t, matrix, mod, expectedInverse, expectedDeterminant)
{
	const actual = gaussJordan(matrix, mod);
	t.deepEqual(actual.inverse, expectedInverse);
	t.is(actual.determinant, expectedDeterminant);
}

test("Gauss-Jordan dimension 3", testGaussJordan,
	[
		[0, 11, 15], 
		[7, 0, 1], 
		[4, 19, 0]
	],
	26,
	[
		[3, 7, 1],
		[24, 4, 19],
		[5, 4, 19]
	],
	19
);

test("Gauss-Jordan dimension 3", testGaussJordan,
	[
		[17, 17, 5],
		[21, 18, 21],
		[2, 2, 19]

	],
	26,
	[
		[4, 9, 15],
		[15, 17, 6],
		[24, 0, 17]
	],
	17
);

test("Gauss-Jordan dimension 3", testGaussJordan,
	[
		[6, 24, 1],
		[13, 16, 10],
		[20, 17, 15]

	],
	26,
	[
		[8, 5, 10],
		[21, 8, 21],
		[21, 12, 8]
	],
	25
);

test("Gauss-Jordan dimension 2", testGaussJordan,
	[
		[7, 8], 
		[11, 11]
	],
	26,
	[
		[25, 22],
		[1, 23]
	],
	7
);

test("Gauss-Jordan dimension 2", testGaussJordan,
	[
		[0, 1], 
		[1, 1]
	],
	5,
	[
		[4, 1],
		[1, 0]
	],
	4
);

test("Gauss-Jordan dimension 2", testGaussJordan,
	[
		[3, 2], 
		[2, 1]
	],
	6,
	[
		[5, 2],
		[2, 3]
	],
	5
);

test("Gauss-Jordan dimension 5", testGaussJordan,
	[
		[4, 3, 2, 1, 0],
		[3, 2, 1, 0, 4],
		[2, 1, 4, 4, 3],
		[1, 0, 4, 3, 2],
		[0, 4, 3, 2, 2]
	],
	6,
	[
		[4, 1, 0, 0, 1],
		[1, 1, 2, 1, 3],
		[0, 2, 4, 4, 1],
		[0, 1, 4, 1, 3],
		[1, 3, 1, 3, 5]
	],
	1
);