const { ANIME } = require('@consumet/extensions');
const animepahe = new ANIME.AnimePahe();

async function test() {
  try {
    console.log('--- Testing "Renegade Immortal" ---');
    const res1 = await animepahe.search('Renegade Immortal');
    console.log(JSON.stringify(res1, null, 2));

    console.log('--- Testing "Xian Ni" ---');
    const res2 = await animepahe.search('Xian Ni');
    console.log(JSON.stringify(res2, null, 2));

    console.log('--- Testing "Perfect World" ---');
    const res3 = await animepahe.search('Perfect World');
    console.log(JSON.stringify(res3, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
