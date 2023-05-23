

exports.nWords = (text, numWords) => {
    const words = text.split(" ");
    const nWords = [];
    for (let i = 0; i < numWords; ++i) nWords.push(words[i]);

    return nWords.join(" ");
}