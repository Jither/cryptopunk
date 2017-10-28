import bigint from "./jither.bigint";

const a = bigint("12345678901234567890");
const b = bigint("-12345678901234567890");

console.log(a.toString());
console.log(b.toString());
console.log(a.add(b).toString());
console.log(a.mul(b).mul(b).toString());
console.log(a.mul(b).mul(b).add(1).toString());