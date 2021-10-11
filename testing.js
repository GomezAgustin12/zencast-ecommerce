let users = [];
let products = [];

const cantElements = 10000;

// for (let cantElements = 0; cantElements < 20000; cantElements += 1000) {
console.log('\n', "'\033[32m' ITERATION N#:", cantElements);
for (let i = 0; i < cantElements; i++) {
	users.push({ id: i, name: `name-${i}` });
}

for (let i = 0; i < cantElements; i++) {
	products.push({
		id: i,
		name: `product-name-${i}`,
		user_id: Math.floor(Math.random() * cantElements),
	});
}

// console.log(users);

//-----------------------------METODO CON FIND()----------------------

console.time('Find');
const usingFind = () =>
	products.map((x) => ({
		...x,
		user: users.find((y) => y.id === x.user_id),
	}));
const mixFind = usingFind();

// console.log('mix', mixFind[0]);
console.timeEnd('Find');

//-----------------------------METODO CON Reduce()----------------------

console.time('Reduce');
const usingReduce = () => {
	const indexedUsers = users.reduce((accumulator, currentElement) => {
		accumulator[currentElement.id] = currentElement;
		return accumulator;
	}, {});
	return products.map((x) => ({
		...x,
		user: indexedUsers[x.user_id],
	}));
};
const mixReduce = usingReduce();

// console.log('mixReduce', mixReduce);
console.timeEnd('Reduce');
// }

console.log("'\033[31m' ----------------------------FINISHED---------------------------");
