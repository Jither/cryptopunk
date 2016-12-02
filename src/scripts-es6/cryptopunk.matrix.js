import { mod, modularInverse } from "./cryptopunk.math";

function isIdentity(matrix, dim)
{
	for (let rowIndex = 0; rowIndex < dim; rowIndex++)
	{
		const row = matrix[rowIndex];
		for (let colIndex = 0; colIndex < dim; colIndex++)
		{
			const expected = (colIndex === rowIndex) ? 1 : 0;
			if (row[colIndex] !== expected)
			{
				return false;
			}
		}
	}
	return true;
}

function clone(matrix)
{
	const result = new Array(matrix.length);
	for (let row = 0; row < matrix.length; row++)
	{
		result[row] = matrix[row].concat();
	}
	return result;
}

function _gaussJordan(matrix, m, startCol)
{
	const dim = matrix.length;

	const mat = clone(matrix);
	//console.log("Input:", matrixToString(mat));
	let inv = getIdentity(dim);
	let det = 1;
	for (let i = 0; i < dim; i++)
	{
		let col = (startCol + i) % dim;
		let row = col;
		// Swap row if current column entry is 0 or has no modular inverse:
		while (row < dim && (mat[row][col] === 0 || modularInverse(mat[row][col], m) === null))
		{
			//console.log("modular inverse:", modularInverse(mat[row][col], m));
			row++;
		}

		// If we found no appropriate row to swap with, we'll find no inverse:
		if (row === dim)
		{
			return null;
		}

		// Do the actual swapping if needed:
		if (row !== col)
		{
			[mat[col], mat[row]] = [mat[row], mat[col]];
			[inv[col], inv[row]] = [inv[row], inv[col]];
			det = -det;
			//console.log("Swapped", col, ":", matrixToString(mat));
		}

		let cM = mat[col],
			cI = inv[col];

		for (row = 0; row < dim; row++)
		{
			const rM = mat[row];
			const rI = inv[row];

			if (row === col)
			{
				const factor = modularInverse(cM[col], m);
				//console.log(factor);
				if (factor === null)
				{
					return null;
				}
				for (let s = 0; s < dim; s++)
				{
					rM[s] = (rM[s] * factor) % m;
					rI[s] = (rI[s] * factor) % m;
				}
				det = (det * factor) % m;
				//console.log("Multiplied (", factor, ")", col, ":", matrixToString(mat));
			}
			else if (rM[col] !== 0)
			{
				let factor = modularInverse(cM[col], m);
				if (factor === null)
				{
					return null;
				}
				factor *= rM[col]
				//console.log(factor);
				for (let s = 0; s < dim; s++)
				{
					rM[s] = mod(rM[s] - cM[s] * factor, m);
					rI[s] = mod(rI[s] - cI[s] * factor, m);
				}
				//console.log("Added", col, ":", matrixToString(mat));
			}
		}
	}

	if (!isIdentity(mat, dim))
	{
		// TODO: This will only work if we reached at least (non-reduced) Row Echelon Form:
		for (let i = 0; i < dim; i++)
		{
			det *= mat[i][i];
		}
		inv = null;
	}
	if (det < 0)
	{
		det += m;
	}

	return { inverse: inv, determinant: det };
}

function gaussJordan(matrix, m)
{
	const dim = matrix.length;

	// Try starting from each column until a solution has been found or all columns have been tried
	for (let startCol = 0; startCol < dim; startCol++)
	{
		const result = _gaussJordan(matrix, m, startCol);
		if (result !== null)
		{
			return result;
		}
	}

	return {
		inverse: null, determinant: null
	};
}

function multiplyVector(matrix, vector)
{
	const dim = vector.length;
	// Assumption: Matrix is square and dimensions equal vector dimension
	const result = new Array(dim);
	result.fill(0);

	for (let i = 0; i < dim; i++)
	{
		const row = matrix[i];
		for (let col = 0; col < dim; col++)
		{
			result[i] += row[col] * vector[col];
		}
	}

	return result;
}

function matrixToString(matrix)
{
	if (matrix === null)
	{
		return null;
	}
	let result = "[\n";
	for (let i = 0; i < matrix.length; i++)
	{
		result += matrix[i].join(", ") + "\n";
	}
	result += "]\n";
	return result;
}

function getIdentity(dim)
{
	const result = new Array(dim);
	for (let rowIndex = 0; rowIndex < dim; rowIndex++)
	{
		const row = result[rowIndex] = new Array(dim);
		row.fill(0);
		row[rowIndex] = 1;
	}
	return result;
}

export {
	gaussJordan,
	matrixToString,
	multiplyVector
};