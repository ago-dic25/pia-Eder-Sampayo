export const getFraseAleatoria = async () => {
  try {
    const res = await fetch("https://dummyjson.com/quotes/random");
    const data = await res.json();

    console.log(data);

    console.log(data.quote);

    return {
      frase: data.quote,
      autor: data.author,
    };
  } catch (error) {
    console.log("Error:", error);
    return null;
  }
};
