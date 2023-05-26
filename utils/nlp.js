const winkNLP = require( 'wink-nlp' );
const its = require( 'wink-nlp/src/its.js' );
const model = require( 'wink-eng-lite-web-model' );
const nlp = winkNLP( model );

exports.nWords = (text, numWords) => {
    const words = text.split(" ");
    const nWords = [];
    for (let i = 0; i < numWords; ++i) nWords.push(words[i]);

    return nWords.join(" ").trim();
}

exports.sentences = (text) => {
    const doc = nlp.readDoc( text );
    const sentences = doc.sentences().out();
    return sentences;
}
